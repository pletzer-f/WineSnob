-- Consumption accounting: each pour records the bottle's worth and cost at
-- that moment, so drinking reads as a realized withdrawal, not a loss.
alter table public.drinks
  add column if not exists value_at_drink numeric,
  add column if not exists paid_at_drink numeric;
comment on column public.drinks.value_at_drink is 'Market value per bottle at the moment it was drunk.';

-- Desk-note freshness fingerprint: the figures the note was written against.
alter table public.profiles
  add column if not exists portfolio_note_value numeric,
  add column if not exists portfolio_note_drinks integer;

-- Per-bottle price history, written with each valuation. Powers time-ranged
-- Top Movers (1M / 6M / 1Y).
create table if not exists public.bottle_prices (
  user_id uuid not null references auth.users (id) on delete cascade,
  bottle_id text not null references public.bottles (id) on delete cascade,
  day text not null,
  unit numeric not null,
  created_at timestamptz not null default now(),
  primary key (user_id, bottle_id, day)
);
alter table public.bottle_prices enable row level security;
drop policy if exists "own bottle prices" on public.bottle_prices;
create policy "own bottle prices" on public.bottle_prices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
