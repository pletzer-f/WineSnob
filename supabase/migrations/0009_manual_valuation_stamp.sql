-- When the user last pressed the manual "price my cellar" button; the app
-- allows one manual live-pricing run per month on top of the auto cadence.
alter table public.profiles add column if not exists manual_valued_at timestamptz;
