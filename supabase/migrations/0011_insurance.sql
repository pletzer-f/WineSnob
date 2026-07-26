-- Insurance: policy details, an admin-granted tier, and sealed inventory
-- attestations for collectors whose insurers demand a clear data trail.
--
-- Model:
--   * profiles gains the user's own policy facts (insurer, declared sum,
--     renewal date, per-item limit). The user edits these freely; they ride
--     the normal profile sync.
--   * entitlements: which paid tiers an account holds. Users can READ their
--     own row; only the service role (admin edge function) writes, so nobody
--     can grant themselves the tier.
--   * inventory_attestations: an immutable, append-only record of "this is
--     exactly what the cellar held at this moment". The snapshot is built
--     SERVER-SIDE from the caller's own bottles by a security-definer RPC,
--     hashed with SHA-256, and locked by trigger against UPDATE/DELETE even
--     for the service role. For a claim, the collector can prove what was
--     in the cellar before the loss, and that the record was never touched.
--
-- Verify a stored hash at any time:
--   select sha256 = encode(extensions.digest(convert_to(snapshot::text,
--     'UTF8'), 'sha256'), 'hex') from inventory_attestations where seq = N;

create extension if not exists pgcrypto with schema extensions;

-- ---- the user's own policy facts ----
alter table public.profiles
  add column if not exists policy_insurer text,
  add column if not exists policy_declared numeric,
  add column if not exists policy_renewal date,
  add column if not exists policy_item_limit numeric;

-- ---- admin-granted tiers ----
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  insurance boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

drop policy if exists entitlements_own_read on public.entitlements;
create policy entitlements_own_read on public.entitlements
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies: the service role alone writes.

-- ---- sealed inventory attestations ----
create table if not exists public.inventory_attestations (
  id uuid primary key,
  seq bigint generated always as identity,
  user_id uuid,                    -- no FK: attestations outlive deleted
  user_email text,                 -- accounts, like billing statements
  currency text not null default 'EUR',
  positions integer not null,
  bottles integer not null,
  total_value numeric not null,
  policy jsonb,                    -- the policy facts frozen at seal time
  snapshot jsonb not null,         -- every position, values and basis included
  sha256 text not null,            -- sha256(snapshot::text), hex
  note text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_attestations_user_idx
  on public.inventory_attestations (user_id, created_at desc);

alter table public.inventory_attestations enable row level security;

drop policy if exists attestations_own_read on public.inventory_attestations;
create policy attestations_own_read on public.inventory_attestations
  for select using (auth.uid() = user_id);
-- No insert policy: rows are born only through the RPC below.

-- Attestations are carved in stone.
create or replace function public.inventory_attestations_lock()
returns trigger language plpgsql as $$
begin
  raise exception 'Inventory attestations are immutable';
end $$;

drop trigger if exists inventory_attestations_lock on public.inventory_attestations;
create trigger inventory_attestations_lock
  before update or delete on public.inventory_attestations
  for each row execute function public.inventory_attestations_lock();

-- Format factor = volume equivalents x collector premium, mirroring
-- app/src/domain/formats.ts (the single source of truth). Item value =
-- price-per-standard-bottle x this factor.
create or replace function public.format_factor(p_format text)
returns numeric
language sql immutable as $$
  select case coalesce(p_format, 'standard')
    when 'half' then 0.5 * 0.95
    when 'magnum' then 2 * 1.12
    when 'jeroboam' then 4 * 1.25
    when 'rehoboam' then 6 * 1.35
    when 'methuselah' then 8 * 1.5
    when 'salmanazar' then 12 * 1.6
    when 'balthazar' then 16 * 1.7
    when 'nebuchadnezzar' then 20 * 1.9
    else 1
  end
$$;

-- Seal the caller's inventory: read their bottles as they stand, freeze
-- every position with its valuation basis, hash it, and store the record.
-- The client sends nothing but an optional note, so nothing can be forged.
create or replace function public.create_inventory_attestation(
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_email text;
  v_policy jsonb;
  v_snapshot jsonb;
  v_positions integer;
  v_bottles integer;
  v_total numeric;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'Sign in to seal an inventory.';
  end if;
  if not coalesce((select insurance from entitlements where user_id = v_user), false) then
    raise exception 'Insurance features are not enabled for this account.';
  end if;
  -- One seal at a time, and no accidental double-seals.
  perform pg_advisory_xact_lock(hashtext('winesnob-attest-' || v_user::text));
  if exists (
    select 1 from inventory_attestations
     where user_id = v_user and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'An attestation was sealed moments ago. The record stands.';
  end if;

  select email into v_email from auth.users where id = v_user;
  select jsonb_build_object(
           'insurer', p.policy_insurer,
           'declared', p.policy_declared,
           'renewal', p.policy_renewal,
           'item_limit', p.policy_item_limit
         )
    into v_policy
    from profiles p where p.user_id = v_user;

  with pos as (
    select b.id, coalesce(c.name, b.cellar_id) as cellar, b.name, b.producer,
           b.vintage, b.format, b.quantity, b.region, b.country, b.colour,
           b.paid, b.unit, b.market_unit, b.market_low, b.market_high,
           b.market_source, b.market_as_of, b.photo,
           case when coalesce(b.market_unit, 0) > 0 then 'market' else 'recorded' end as basis,
           round((coalesce(nullif(b.market_unit, 0), b.unit)
                  * format_factor(b.format))::numeric, 2) as item_value,
           round((b.quantity * coalesce(nullif(b.market_unit, 0), b.unit)
                  * format_factor(b.format))::numeric, 2) as position_value
      from bottles b
      left join cellars c on c.id = b.cellar_id and c.user_id = v_user
     where b.user_id = v_user and b.quantity > 0
  )
  select coalesce(jsonb_agg(to_jsonb(pos.*) order by pos.cellar, pos.name, pos.vintage), '[]'::jsonb),
         count(*)::int,
         coalesce(sum(pos.quantity), 0)::int,
         coalesce(sum(pos.position_value), 0)
    into v_snapshot, v_positions, v_bottles, v_total
    from pos;

  if v_positions = 0 then
    raise exception 'Nothing to attest: the cellar is empty.';
  end if;

  insert into inventory_attestations
      (id, user_id, user_email, currency, positions, bottles, total_value,
       policy, snapshot, sha256, note)
  values
      (v_id, v_user, v_email, 'EUR', v_positions, v_bottles,
       round(v_total::numeric, 2), v_policy, v_snapshot,
       encode(extensions.digest(convert_to(v_snapshot::text, 'UTF8'), 'sha256'), 'hex'),
       nullif(trim(coalesce(p_note, '')), ''))
  returning to_jsonb(inventory_attestations.*) into v_out;

  return v_out;
end $$;

revoke all on function public.create_inventory_attestation(text) from public;
revoke all on function public.create_inventory_attestation(text) from anon;
grant execute on function public.create_inventory_attestation(text) to authenticated;
