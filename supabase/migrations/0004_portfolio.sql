-- Portfolio view: real valuation history + the AI desk note.
create table if not exists public.valuation_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  day text not null,
  total numeric not null,
  invested numeric,
  bottles integer not null default 0,
  currency text,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
comment on table public.valuation_snapshots is 'Daily record of a cellar''s worth; written on app open and after each valuation refresh. Powers the portfolio history chart.';

alter table public.valuation_snapshots enable row level security;
drop policy if exists "own snapshots" on public.valuation_snapshots;
create policy "own snapshots" on public.valuation_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.profiles
  add column if not exists portfolio_note text,
  add column if not exists portfolio_note_at text;
comment on column public.profiles.portfolio_note is 'AI desk note across the whole cellar, refreshed with valuations.';
