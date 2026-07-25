-- Usage credits: an append-only ledger, denominated in USD at raw cost.
--
-- Grants are positive entries written by the admin function; usage is
-- metered automatically by a trigger on ai_usage, in the same transaction
-- as the cost row itself, so consumption can never escape the meter. The
-- balance is the sum. Nothing is ever updated or deleted (triggers forbid
-- it); corrections are new 'adjustment' entries.
--
-- Users may READ their own entries (and their balance through the
-- security_invoker view) so the app can show what they hold; only the
-- service role writes.

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  delta_usd numeric not null,
  kind text not null check (kind in ('grant', 'usage', 'adjustment')),
  ref text,                    -- ai_usage id for usage entries
  note text,
  created_by uuid,             -- the admin who granted, null for metered usage
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx
  on public.credit_ledger (user_id, created_at desc);

alter table public.credit_ledger enable row level security;

create policy "own credit entries"
  on public.credit_ledger for select
  to authenticated
  using (user_id = auth.uid());
-- No insert/update/delete policies: only the service role writes.

-- Carved in stone, like the billing statements.
create or replace function public.credit_ledger_lock()
returns trigger language plpgsql as $$
begin
  raise exception 'Credit ledger entries are immutable';
end $$;

drop trigger if exists credit_ledger_lock on public.credit_ledger;
create trigger credit_ledger_lock
  before update or delete on public.credit_ledger
  for each row execute function public.credit_ledger_lock();

-- The meter: every attributed AI cost row spends credits atomically.
create or replace function public.credit_meter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into credit_ledger (user_id, delta_usd, kind, ref, note)
  values (new.user_id, -new.cost_usd, 'usage', new.id::text, new.fn);
  return new;
end $$;

drop trigger if exists ai_usage_credit_meter on public.ai_usage;
create trigger ai_usage_credit_meter
  after insert on public.ai_usage
  for each row
  when (new.user_id is not null and new.cost_usd > 0)
  execute function public.credit_meter();

-- The balance, one row per user. security_invoker keeps the base table's
-- RLS in force: signed-in users see only their own row, the service role
-- sees everyone.
create or replace view public.credit_balances
with (security_invoker = true) as
  select user_id, round(sum(delta_usd)::numeric, 4) as balance_usd
    from public.credit_ledger
   group by user_id;

grant select on public.credit_balances to authenticated;
