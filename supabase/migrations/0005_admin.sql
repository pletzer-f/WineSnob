-- Admin console: membership table + per-call AI usage log.

-- Admin membership. Deliberately NO RLS policies: with row level security
-- enabled and no policies, neither anon nor authenticated users can read or
-- write it. Only the service role (edge functions) can, so a user can never
-- promote themselves.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

-- Per-call AI usage log, written by the edge functions with the service role.
-- Powers the admin console's cost-per-user view.
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  fn text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  searches integer not null default 0,
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_idx on public.ai_usage (user_id, created_at);
alter table public.ai_usage enable row level security;

-- Grant the founder admin access.
insert into public.admin_users (user_id)
select id from auth.users where email = 'fabian.pletzer@pletzer-gruppe.at'
on conflict (user_id) do nothing;
