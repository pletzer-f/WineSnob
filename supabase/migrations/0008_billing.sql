-- Billing: an immutable ledger of usage statements.
--
-- Model: every ai_usage row belongs to at most ONE statement. "Settling"
-- a user claims all their unbilled rows up to a cutoff, freezes the totals
-- and per-function lines into a billing_statements row, and by construction
-- the outstanding balance (rows with statement_id IS NULL) restarts at zero.
--
-- Bulletproofing:
--   * billing_statements: RLS with no policies (only the service role reads,
--     through the admin function) AND a trigger that rejects UPDATE/DELETE
--     outright, so even service-role code cannot alter or remove a statement.
--   * ai_usage: once a row carries a statement_id it is frozen (no updates)
--     and cannot be deleted, so the detail behind every statement survives.
--   * create_billing_statement(): SECURITY DEFINER, executable by the
--     service role only, serialised per user with an advisory lock, and the
--     claim + freeze happen in ONE SQL statement (all-or-nothing).

-- Which statement (if any) has billed each usage row.
alter table public.ai_usage
  add column if not exists statement_id uuid;

create table if not exists public.billing_statements (
  id uuid primary key,
  seq bigint generated always as identity,
  user_id uuid,                    -- no FK: statements outlive deleted accounts
  user_email text,                 -- frozen at settle time
  period_start timestamptz,
  period_end timestamptz not null,
  calls integer not null,
  input_tokens bigint not null,
  output_tokens bigint not null,
  searches integer not null,
  total_usd numeric not null,
  lines jsonb not null,            -- [{fn, calls, input_tokens, output_tokens, searches, usd}]
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists billing_statements_user_idx
  on public.billing_statements (user_id, created_at desc);
create index if not exists ai_usage_unbilled_idx
  on public.ai_usage (user_id, created_at) where statement_id is null;

alter table public.billing_statements enable row level security;
-- No policies: only the service role, via the admin edge function.

-- The FK is deferred so the settle function can claim rows and insert the
-- statement in one atomic SQL statement (checked at commit).
alter table public.ai_usage
  add constraint ai_usage_statement_fk
  foreign key (statement_id) references public.billing_statements (id)
  deferrable initially deferred;

-- Statements are carved in stone.
create or replace function public.billing_statements_lock()
returns trigger language plpgsql as $$
begin
  raise exception 'Billing statements are immutable';
end $$;

drop trigger if exists billing_statements_lock on public.billing_statements;
create trigger billing_statements_lock
  before update or delete on public.billing_statements
  for each row execute function public.billing_statements_lock();

-- A billed usage row is frozen: it can never change or disappear.
create or replace function public.ai_usage_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if old.statement_id is not null then
      raise exception 'Billed usage rows are frozen';
    end if;
    return new;
  end if;
  if old.statement_id is not null then
    raise exception 'Billed usage rows cannot be deleted';
  end if;
  return old;
end $$;

drop trigger if exists ai_usage_guard on public.ai_usage;
create trigger ai_usage_guard
  before update or delete on public.ai_usage
  for each row execute function public.ai_usage_guard();

-- Settle a user: claim every unbilled row up to the cutoff, freeze the
-- totals, return the new statement. Raises when there is nothing to settle.
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
  v_out jsonb;
begin
  -- One settle at a time per user; parallel clicks queue behind this.
  perform pg_advisory_xact_lock(hashtext('winesnob-billing-' || p_user::text));

  select max(period_end) into v_prev_end
    from billing_statements where user_id = p_user;
  select email into v_email from auth.users where id = p_user;

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
       note, created_by)
  select v_id, p_user, v_email, coalesce(v_prev_end, agg.first_at), p_until,
         agg.calls, agg.input_tokens, agg.output_tokens, agg.searches,
         round(agg.total_usd::numeric, 4), fn_lines.lines, p_note, p_admin
    from agg, fn_lines
   where agg.calls > 0
  returning to_jsonb(billing_statements.*) into v_out;

  if v_out is null then
    raise exception 'Nothing to settle: no unbilled usage before the cutoff';
  end if;
  return v_out;
end $$;

revoke all on function public.create_billing_statement(uuid, timestamptz, uuid, text) from public;
revoke all on function public.create_billing_statement(uuid, timestamptz, uuid, text) from anon;
revoke all on function public.create_billing_statement(uuid, timestamptz, uuid, text) from authenticated;
grant execute on function public.create_billing_statement(uuid, timestamptz, uuid, text) to service_role;
