-- Real market valuation: cache the provider price per bottle so it persists
-- across devices and reloads. Populated by the `value-cellar` edge function;
-- null until a price source is connected and a refresh is run.
alter table public.bottles
  add column if not exists market_unit numeric,
  add column if not exists market_low numeric,
  add column if not exists market_high numeric,
  add column if not exists market_source text,
  add column if not exists market_as_of text,
  add column if not exists market_read text;

comment on column public.bottles.market_unit is 'Provider market price per standard 750ml bottle, in the owner currency. Null until valued.';
comment on column public.bottles.market_as_of is 'ISO date the market price was fetched.';
comment on column public.bottles.market_source is 'Price provider display name, e.g. Wine-Searcher.';
