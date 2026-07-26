-- Commerce: per-account markup, settlement-drawn balances, billed statements.
--
-- Model (owner's decisions, July 2026):
--   * billing_config holds each account's markup (default 1.50x) and an
--     internal flag. Service-role only: customers never read the multiplier,
--     though my_billing (below) exposes their resulting prices.
--   * The customer's balance is drawn at SETTLEMENT, not per call: the old
--     per-call credit_meter trigger is dropped. Between statements, usage
--     accrues as outstanding at billed value.
--   * credit_balances keeps its name and column but now answers "available":
--     money on file minus outstanding billed. The five deployed AI gates and
--     the app read it unchanged, so the -10 floor now pauses on available.
--   * Statements freeze the markup and the billed total at settle time and
--     (for non-internal accounts) draw the billed amount from the ledger in
--     the same transaction. Internal accounts bill at cost, draw nothing,
--     and are excluded from revenue figures in the admin function.
--   * Usage recorded BEFORE this migration was already metered per call, so
--     it is locked into transition statements here that draw nothing.

-- ---- 1) per-account commercial config ----
create table if not exists public.billing_config (
  user_id uuid primary key references auth.users (id) on delete cascade,
  markup numeric not null default 1.5 check (markup >= 1 and markup <= 10),
  internal boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

alter table public.billing_config enable row level security;
-- No policies: only the service role reads and writes the multiplier.

-- ---- 2) statements carry the frozen rate ----
alter table public.billing_statements
  add column if not exists markup numeric,
  add column if not exists billed_usd numeric;

-- ---- 3) transition: lock pre-commerce usage into cost statements ----
-- That usage was already metered per call under the old model; settling it
-- with the v1 function (still in place at this point) draws nothing, so the
-- new era starts with zero outstanding and no double-charge.
do $$
declare u record;
begin
  for u in select distinct user_id from ai_usage
            where statement_id is null and user_id is not null loop
    perform create_billing_statement(
      u.user_id, now(), '9b1885b4-f357-4d1a-9e26-4b88cb7ed4dd',
      'Transition to commercial billing');
  end loop;
end $$;

-- ---- 4) settle v2: freeze the rate, bill at markup, draw the balance ----
create or replace function public.create_billing_statement(
  p_user uuid,
  p_until timestamptz default now(),
  p_admin uuid default null,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_prev_end timestamptz;
  v_email text;
  v_markup numeric;
  v_internal boolean;
  v_out jsonb;
begin
  -- One settle at a time per user; parallel clicks queue behind this.
  perform pg_advisory_xact_lock(hashtext('winesnob-billing-' || p_user::text));

  select max(period_end) into v_prev_end
    from billing_statements where user_id = p_user;
  select email into v_email from auth.users where id = p_user;

  select case when internal then 1.0 else markup end, internal
    into v_markup, v_internal
    from billing_config where user_id = p_user;
  v_markup := coalesce(v_markup, 1.5);
  v_internal := coalesce(v_internal, false);

  with claimed as (
    update ai_usage
       set statement_id = v_id
     where user_id = p_user
       and statement_id is null
       and created_at <= p_until
     returning fn, input_tokens, output_tokens, searches, cost_usd, created_at
  ),
  agg as (
    select count(*)::int as calls,
           coalesce(sum(input_tokens), 0)::bigint as input_tokens,
           coalesce(sum(output_tokens), 0)::bigint as output_tokens,
           coalesce(sum(searches), 0)::int as searches,
           coalesce(sum(cost_usd), 0) as total_usd,
           min(created_at) as first_at
      from claimed
  ),
  fn_lines as (
    select coalesce(jsonb_agg(l order by l->>'fn'), '[]'::jsonb) as lines
      from (
        select jsonb_build_object(
                 'fn', fn,
                 'calls', count(*),
                 'input_tokens', sum(input_tokens),
                 'output_tokens', sum(output_tokens),
                 'searches', sum(searches),
                 'usd', round(sum(cost_usd)::numeric, 4)
               ) as l
          from claimed
         group by fn
      ) sub
  )
  insert into billing_statements
      (id, user_id, user_email, period_start, period_end,
       calls, input_tokens, output_tokens, searches, total_usd, lines,
       markup, billed_usd, note, created_by)
  select v_id, p_user, v_email, coalesce(v_prev_end, agg.first_at), p_until,
         agg.calls, agg.input_tokens, agg.output_tokens, agg.searches,
         round(agg.total_usd::numeric, 4), fn_lines.lines,
         v_markup, round((agg.total_usd * v_markup)::numeric, 2),
         p_note, p_admin
    from agg, fn_lines
   where agg.calls > 0
  returning to_jsonb(billing_statements.*) into v_out;

  if v_out is null then
    raise exception 'Nothing to settle: no unbilled usage before the cutoff';
  end if;

  -- The settlement is the draw: the billed amount leaves the balance in the
  -- same transaction the statement locks. Internal accounts draw nothing.
  if not v_internal then
    insert into credit_ledger (user_id, delta_usd, kind, ref, note, created_by)
    values (p_user, -((v_out->>'billed_usd')::numeric), 'usage', v_id::text,
            'WS-' || lpad(v_out->>'seq', 4, '0'), p_admin);
  end if;

  return v_out;
end $$;

revoke all on function public.create_billing_statement(uuid, timestamptz, uuid, text) from public;
revoke all on function public.create_billing_statement(uuid, timestamptz, uuid, text) from anon;
revoke all on function public.create_billing_statement(uuid, timestamptz, uuid, text) from authenticated;
grant execute on function public.create_billing_statement(uuid, timestamptz, uuid, text) to service_role;

-- ---- 5) the meter moves from per-call to settlement ----
drop trigger if exists ai_usage_credit_meter on public.ai_usage;
drop trigger if exists credit_meter on public.ai_usage;
drop function if exists public.credit_meter();

-- ---- 6) credit_balances now answers "available" ----
-- Same name, same column, new meaning: money on file minus outstanding at
-- billed value. The view runs with owner rights and scopes itself: a signed
-- in user sees only their row (auth.uid()); the service role (no sub claim)
-- sees every row, which is what the AI gates and admin function need.
drop view if exists public.credit_balances;
create view public.credit_balances as
select ids.user_id,
       (coalesce(l.bal, 0)
        - round((coalesce(u.cost, 0)
                 * coalesce(case when c.internal then 1.0 else c.markup end, 1.5))::numeric, 2)
       )::numeric as balance_usd
  from (
    select user_id from credit_ledger
    union
    select user_id from ai_usage where user_id is not null
  ) ids
  left join (select user_id, sum(delta_usd) as bal from credit_ledger group by user_id) l
    on l.user_id = ids.user_id
  left join (select user_id, sum(cost_usd) as cost from ai_usage
              where statement_id is null group by user_id) u
    on u.user_id = ids.user_id
  left join billing_config c on c.user_id = ids.user_id
 where ids.user_id = coalesce(auth.uid(), ids.user_id);

revoke all on public.credit_balances from public;
revoke all on public.credit_balances from anon;
grant select on public.credit_balances to authenticated;
grant select on public.credit_balances to service_role;

-- ---- 7) my_billing: the customer's own commercial picture ----
-- One row for the signed-in user: money on file, what this period's usage
-- will bill, what remains, and the markup so the app can quote feature
-- prices at their rate.
drop view if exists public.my_billing;
create view public.my_billing as
with me as (select auth.uid() as uid),
cfg as (
  select coalesce((select case when b.internal then 1.0 else b.markup end
                     from billing_config b, me where b.user_id = me.uid), 1.5) as markup
),
led as (
  select coalesce((select sum(delta_usd) from credit_ledger, me
                    where credit_ledger.user_id = me.uid), 0) as bal
),
outst as (
  select coalesce((select sum(cost_usd) from ai_usage, me
                    where ai_usage.user_id = me.uid and statement_id is null), 0) as cost
)
select me.uid as user_id,
       led.bal::numeric as balance_usd,
       round((outst.cost * cfg.markup)::numeric, 2) as outstanding_usd,
       (led.bal - round((outst.cost * cfg.markup)::numeric, 2))::numeric as available_usd,
       cfg.markup
  from me, cfg, led, outst;

revoke all on public.my_billing from public;
revoke all on public.my_billing from anon;
grant select on public.my_billing to authenticated;
