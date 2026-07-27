import { supabase } from '@/lib/supabase'
import { setMarketSink, setPriceSink, setRemoteSync, setSnapshotSink, type MarketWrite } from '@/store/store'
import { inferArea, inferCountry } from '@/domain/wine'
import type { PersistData } from '@/data/sync'
import type { Bottle, Drink, Vintage, Wish } from '@/domain/types'
import type { BottlePrice, Snapshot } from '@/domain/portfolio'

/* eslint-disable @typescript-eslint/no-explicit-any */
// The generated Supabase types are loose until `generate_typescript_types`
// runs against the live schema, so query payloads are cast at the boundary.
const db = supabase as any

function parseVintage(v: unknown): Vintage {
  if (v === 'NV' || v == null) return v === 'NV' ? 'NV' : 2020
  const n = Number(v)
  return Number.isFinite(n) ? n : 'NV'
}

// ---- domain -> row ----
function profileRow(userId: string, d: PersistData) {
  return {
    user_id: userId,
    name: d.account.name,
    email: d.account.email,
    plan: d.account.plan,
    reminders: d.settings.reminders,
    weekly: d.settings.weekly,
    auto_value: d.settings.autoValue,
    price_cadence: d.settings.priceCadence,
    share: d.settings.share,
    household: d.settings.household,
    currency: d.settings.currency,
    default_view: d.settings.defaultView,
    measure: d.measure,
    active_cellar: d.activeCellar,
    stat_keys: d.statKeys,
    log_stat_keys: d.logStatKeys,
    view: d.view,
    onboarded: d.onboarded,
    portfolio_note: d.portfolioNote?.text ?? null,
    portfolio_note_at: d.portfolioNote?.asOf ?? null,
    manual_valued_at: d.manualValuedAt ?? null,
    portfolio_note_value: d.portfolioNote?.value ?? null,
    portfolio_note_drinks: d.portfolioNote?.drinks ?? null,
    policy_insurer: d.policy?.insurer || null,
    policy_declared: d.policy?.declared ?? null,
    policy_renewal: d.policy?.renewal || null,
    policy_item_limit: d.policy?.itemLimit ?? null,
    updated_at: new Date().toISOString(),
  }
}
// Market columns are deliberately ABSENT from this payload: the whole
// snapshot mirrors last-write-wins, and a stale session's mirror once wiped
// freshly written valuations (hannes, 2026-07-27). Market values travel only
// through saveMarketRemote below, so a push can never touch them.
const bottleRow = (userId: string, b: Bottle) => ({
  id: b.id, user_id: userId, cellar_id: b.cellarId, name: b.name, producer: b.producer,
  vintage: String(b.vintage), region: b.region, area: b.area, country: b.country, colour: b.colour,
  status: b.status, quantity: b.quantity, unit: b.unit, paid: b.paid ?? null, format: b.format,
  grapes: b.grapes, score: b.score, rating: b.rating, drink_from: b.drinkFrom ?? null,
  drink_to: b.drinkTo ?? null, note: b.note, location: b.location ?? null, buy_again: !!b.buyAgain,
  photo: b.photo && !b.photo.startsWith('data:') ? b.photo : null,
})
const drinkRow = (userId: string, r: Drink) => ({
  id: r.id, user_id: userId, bottle_id: r.bottleId || null, cellar_id: r.cellarId, name: r.name,
  producer: r.producer, vintage: String(r.vintage), region: r.region, area: r.area, colour: r.colour,
  format: r.format, drink_from: r.drinkFrom ?? null, drink_to: r.drinkTo ?? null, date: r.date,
  occasion: r.occasion, companions: r.companions, rating: r.rating, note: r.note, buy_again: !!r.buyAgain,
  value_at_drink: r.valueAtDrink ?? null, paid_at_drink: r.paidAtDrink ?? null,
})
const wishRow = (userId: string, w: Wish) => ({
  id: w.id, user_id: userId, name: w.name, producer: w.producer, region: w.region, vintage: w.vintage,
  target_price: w.targetPrice, priority: w.priority, note: w.note,
})
const collRow = (userId: string, c: PersistData['customCollections'][number]) => ({
  id: c.id, user_id: userId, title: c.title, description: c.desc, ids: c.ids,
})

// ---- row -> domain ----
const bottleFromRow = (r: any): Bottle => ({
  id: r.id, cellarId: r.cellar_id, name: r.name, producer: r.producer, vintage: parseVintage(r.vintage),
  region: r.region,
  // Area and country are derived, never edited: prefer the region's word
  // over older stored rows (early scans hardcoded France and let a trailing
  // country segment become the area), so wrong values self-heal on pull.
  area: r.region ? inferArea(r.region) : r.area,
  country: inferCountry(r.region || '') || r.country,
  colour: r.colour, status: r.status,
  quantity: r.quantity, unit: Number(r.unit), paid: r.paid == null ? undefined : Number(r.paid),
  format: r.format, grapes: r.grapes || [], score: r.score, rating: r.rating,
  drinkFrom: r.drink_from ?? undefined, drinkTo: r.drink_to ?? undefined, note: r.note || '',
  location: r.location ?? undefined, buyAgain: !!r.buy_again,
  marketUnit: r.market_unit == null ? undefined : Number(r.market_unit),
  marketLow: r.market_low == null ? undefined : Number(r.market_low),
  marketHigh: r.market_high == null ? undefined : Number(r.market_high),
  marketSource: r.market_source ?? undefined, marketAsOf: r.market_as_of ?? undefined, marketRead: r.market_read ?? undefined,
  photo: r.photo ?? undefined,
})
const drinkFromRow = (r: any): Drink => ({
  id: r.id, bottleId: r.bottle_id || '', cellarId: r.cellar_id, name: r.name, producer: r.producer,
  vintage: parseVintage(r.vintage), region: r.region, area: r.area, colour: r.colour, format: r.format,
  drinkFrom: r.drink_from ?? undefined, drinkTo: r.drink_to ?? undefined, date: r.date,
  occasion: r.occasion, companions: r.companions || '', rating: r.rating || 0, note: r.note || '', buyAgain: !!r.buy_again,
  valueAtDrink: r.value_at_drink == null ? undefined : Number(r.value_at_drink),
  paidAtDrink: r.paid_at_drink == null ? undefined : Number(r.paid_at_drink),
})
const wishFromRow = (r: any): Wish => ({
  id: r.id, name: r.name, producer: r.producer || '', region: r.region || '', vintage: r.vintage || '',
  targetPrice: r.target_price == null ? null : Number(r.target_price), priority: r.priority || 'medium', note: r.note || '',
})

/** Load a user's full dataset. Returns null when the user has no profile yet
 * (a fresh account that still needs onboarding). */
export async function pullUserData(userId: string): Promise<PersistData | null> {
  const [profile, cellars, bottles, drinks, wishlist, collections, snapshots, prices] = await Promise.all([
    db.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    db.from('cellars').select('*').eq('user_id', userId).order('position'),
    db.from('bottles').select('*').eq('user_id', userId),
    db.from('drinks').select('*').eq('user_id', userId),
    db.from('wishlist').select('*').eq('user_id', userId),
    db.from('custom_collections').select('*').eq('user_id', userId),
    db.from('valuation_snapshots').select('day,total,invested,bottles').eq('user_id', userId).order('day', { ascending: true }).limit(1100),
    db.from('bottle_prices').select('bottle_id,day,unit').eq('user_id', userId).order('day', { ascending: true }).limit(8000),
  ])
  const p = profile.data
  if (!p) return null
  return {
    account: { name: p.name || 'Your Cellar', email: p.email || '', plan: p.plan || 'Connoisseur' },
    settings: {
      reminders: !!p.reminders, weekly: !!p.weekly, autoValue: !!p.auto_value,
      // Legacy 'weekly' cadence folds into monthly (the fastest offered now).
      priceCadence: (p.price_cadence === 'weekly' ? 'monthly' : p.price_cadence) || 'monthly',
      share: !!p.share, household: !!p.household,
      currency: p.currency || 'EUR', defaultView: p.default_view || 'grid',
    },
    measure: p.measure || 'value',
    activeCellar: p.active_cellar || 'main',
    statKeys: p.stat_keys || ['bottles', 'value', 'ready', 'regions'],
    logStatKeys: p.log_stat_keys || ['opened', 'regions', 'fav', 'top'],
    view: p.view || 'grid',
    onboarded: !!p.onboarded,
    cellars: (cellars.data || []).map((c: any) => ({ id: c.id, name: c.name })),
    bottles: (bottles.data || []).map(bottleFromRow),
    drinks: (drinks.data || []).map(drinkFromRow),
    wishlist: (wishlist.data || []).map(wishFromRow),
    customCollections: (collections.data || []).map((c: any) => ({ id: c.id, title: c.title, desc: c.description || '', ids: c.ids || [] })),
    snapshots: (snapshots.data || []).map((s: any) => ({
      day: s.day,
      total: Number(s.total),
      invested: s.invested == null ? null : Number(s.invested),
      bottles: s.bottles || 0,
    })),
    bottlePrices: (prices.data || []).map((r: any) => ({ bottleId: r.bottle_id, day: r.day, unit: Number(r.unit) })),
    portfolioNote: p.portfolio_note
      ? {
          text: p.portfolio_note,
          asOf: p.portfolio_note_at || '',
          value: p.portfolio_note_value == null ? undefined : Number(p.portfolio_note_value),
          drinks: p.portfolio_note_drinks == null ? undefined : Number(p.portfolio_note_drinks),
        }
      : null,
    manualValuedAt: p.manual_valued_at || null,
    policy:
      p.policy_insurer || p.policy_declared != null || p.policy_renewal || p.policy_item_limit != null
        ? {
            insurer: p.policy_insurer || '',
            declared: p.policy_declared == null ? null : Number(p.policy_declared),
            renewal: p.policy_renewal || null,
            itemLimit: p.policy_item_limit == null ? null : Number(p.policy_item_limit),
          }
        : null,
  }
}

/** Record per-bottle prices for one valuation day (upsert, append-only). */
export async function saveBottlePricesRemote(userId: string, rows: BottlePrice[]): Promise<void> {
  if (!rows.length) return
  await db.from('bottle_prices').upsert(rows.map((r) => ({ user_id: userId, bottle_id: r.bottleId, day: r.day, unit: r.unit })))
}

/** Write market values straight to their columns, one bottle at a time.
 * This is the ONLY path that touches market_* (bottleRow omits them), so a
 * stale session's whole-snapshot mirror can never erase a valuation. */
export async function saveMarketRemote(userId: string, rows: MarketWrite[]): Promise<void> {
  await Promise.all(
    rows.map((r) =>
      db
        .from('bottles')
        .update({
          market_unit: r.unit,
          market_low: r.low ?? null,
          market_high: r.high ?? null,
          market_source: r.source ?? null,
          market_as_of: r.asOf ?? null,
          market_read: r.read ?? null,
        })
        .eq('user_id', userId)
        .eq('id', r.id),
    ),
  )
}

/** Record one day's cellar worth (upsert; the latest write for a day wins).
 * Snapshots are written directly rather than through the whole-snapshot sync
 * so history is append-only and never bulk-deleted. */
export async function saveSnapshotRemote(userId: string, s: Snapshot, currency: string): Promise<void> {
  await db.from('valuation_snapshots').upsert({
    user_id: userId,
    day: s.day,
    total: s.total,
    invested: s.invested,
    bottles: s.bottles,
    currency,
  })
}

let inFlight = false
let pending: { userId: string; data: PersistData } | null = null

/** Register the store's remote-sync hook: every persisted change mirrors the
 * whole dataset to Supabase (small per-user data; simple and correct). */
export function startRemoteSync() {
  setRemoteSync((userId, data) => {
    pending = { userId, data }
    void flush()
  })
  setSnapshotSink((userId, snap, currency) => {
    void saveSnapshotRemote(userId, snap, currency).catch((e) => console.error('Snapshot sync failed', e))
  })
  setPriceSink((userId, rows) => {
    void saveBottlePricesRemote(userId, rows).catch((e) => console.error('Price history sync failed', e))
  })
  setMarketSink((userId, rows) => {
    void saveMarketRemote(userId, rows).catch((e) => console.error('Market value sync failed', e))
  })
}

async function flush() {
  if (inFlight || !pending) return
  inFlight = true
  const { userId, data } = pending
  pending = null
  try {
    await pushUserData(userId, data)
  } catch (e) {
    console.error('Cloud sync failed', e)
  } finally {
    inFlight = false
    if (pending) void flush()
  }
}

async function pushUserData(userId: string, d: PersistData) {
  await db.from('profiles').upsert(profileRow(userId, d))
  await syncTable('cellars', userId, d.cellars.map((c, i) => ({ id: c.id, user_id: userId, name: c.name, position: i })))
  await syncTable('bottles', userId, d.bottles.map((b) => bottleRow(userId, b)))
  await syncTable('drinks', userId, d.drinks.map((r) => drinkRow(userId, r)))
  await syncTable('wishlist', userId, d.wishlist.map((w) => wishRow(userId, w)))
  await syncTable('custom_collections', userId, d.customCollections.map((c) => collRow(userId, c)))
}

async function syncTable(table: string, userId: string, rows: { id: string }[]) {
  if (rows.length) await db.from(table).upsert(rows)
  const { data: existing } = await db.from(table).select('id').eq('user_id', userId)
  const keep = new Set(rows.map((r) => r.id))
  const toDelete = (existing || []).map((r: any) => r.id).filter((id: string) => !keep.has(id))
  if (toDelete.length) await db.from(table).delete().in('id', toDelete)
}
