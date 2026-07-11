-- Imagery: label photographs on bottles + the global estate dossier cache.

-- The bottle's label photograph, as a storage path in the private `labels`
-- bucket ("{user_id}/{bottle_id}-full.jpg"; a "-thumb" sibling holds the
-- small version). The bucket's per-user folder policies (0002) already
-- guard access.
alter table public.bottles add column if not exists photo text;

-- One researched dossier per estate, shared by every user (researched once,
-- ever). Written only by the winery-profile edge function with the service
-- role; readable by any signed-in user.
create table if not exists public.wineries (
  id text primary key,              -- normalized producer slug
  name text not null,               -- display name of the estate
  summary text,                     -- one-paragraph introduction
  history text,                     -- short history
  region text,
  country text,
  founded text,
  appellation text,
  classification text,
  hectares text,
  production text,
  second_wine text,
  style text,                       -- the house style in a sentence or two
  known_for text,
  image_url text,                   -- licensed image (Wikimedia), if one exists
  image_attribution text,           -- required credit line
  image_license text,
  image_source_url text,            -- the Commons file page
  researched_at timestamptz not null default now()
);

alter table public.wineries enable row level security;

create policy "wineries readable by signed-in users"
  on public.wineries for select
  to authenticated
  using (true);

-- No insert/update/delete policies: only the service role writes.
