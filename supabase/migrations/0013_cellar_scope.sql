-- Cellars are keyed per user. The old global primary key on id alone meant
-- every new account's default 'main' cellar collided with the first user's
-- row: RLS rightly blocked the write, so new accounts silently got no cellar
-- row at all. Scoping the key to (user_id, id) lets every account own its
-- 'main' (and any other id) independently. bottles.cellar_id carries no FK,
-- so nothing else moves.
alter table public.cellars drop constraint cellars_pkey;
alter table public.cellars add primary key (user_id, id);
