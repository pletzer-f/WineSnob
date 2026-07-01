-- WineSnob schema: per-user cellar data with row-level security.
-- Every table is scoped to auth.uid(); a user can only ever see their own rows.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Your Cellar',
  email text,
  plan text not null default 'Connoisseur',
  reminders boolean not null default true,
  weekly boolean not null default false,
  auto_value boolean not null default true,
  price_cadence text not null default 'monthly',
  share boolean not null default false,
  household boolean not null default false,
  currency text not null default 'EUR',
  default_view text not null default 'grid',
  measure text not null default 'value',
  active_cellar text not null default 'main',
  stat_keys text[] not null default '{bottles,value,ready,regions}',
  log_stat_keys text[] not null default '{opened,regions,fav,top}',
  view text not null default 'grid',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- cellars
create table if not exists public.cellars (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Cellar',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cellars_user_idx on public.cellars (user_id);

-- ----------------------------------------------------------------- bottles
create table if not exists public.bottles (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  cellar_id text not null,
  name text not null,
  producer text,
  vintage text,
  region text,
  area text,
  country text,
  colour text,
  status text,
  quantity int not null default 0,
  unit numeric not null default 0,
  paid numeric,
  format text not null default 'standard',
  grapes text[] not null default '{}',
  score int not null default 0,
  rating int not null default 0,
  drink_from int,
  drink_to int,
  note text not null default '',
  location text,
  buy_again boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists bottles_user_idx on public.bottles (user_id);

-- ------------------------------------------------------------------ drinks
create table if not exists public.drinks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  bottle_id text,
  cellar_id text,
  name text,
  producer text,
  vintage text,
  region text,
  area text,
  colour text,
  format text,
  drink_from int,
  drink_to int,
  date date,
  occasion text,
  companions text,
  rating int,
  note text,
  buy_again boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists drinks_user_idx on public.drinks (user_id);

-- ---------------------------------------------------------------- wishlist
create table if not exists public.wishlist (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  producer text,
  region text,
  vintage text,
  target_price numeric,
  priority text not null default 'medium',
  note text,
  created_at timestamptz not null default now()
);
create index if not exists wishlist_user_idx on public.wishlist (user_id);

-- -------------------------------------------------------- custom_collections
create table if not exists public.custom_collections (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  ids text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists custom_collections_user_idx on public.custom_collections (user_id);

-- ------------------------------------------------------------ row-level security
alter table public.profiles enable row level security;
alter table public.cellars enable row level security;
alter table public.bottles enable row level security;
alter table public.drinks enable row level security;
alter table public.wishlist enable row level security;
alter table public.custom_collections enable row level security;

-- profiles: the row IS the user
create policy "profiles are self" on public.profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- one uniform "own rows" policy per data table
create policy "own cellars" on public.cellars
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own bottles" on public.bottles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own drinks" on public.drinks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own wishlist" on public.wishlist
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own collections" on public.custom_collections
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------- profile on new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
