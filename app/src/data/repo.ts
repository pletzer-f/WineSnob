import { supabase } from '@/lib/supabase'
import { setRemoteSync, setSnapshotSink } from '@/store/store'
import type { PersistData } from '@/data/sync'
import type { Bottle, Drink, Vintage, Wish } from '@/domain/types'
import type { Snapshot } from '@/domain/portfolio'

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
    updated_at: new Date().toISOString(),
  }
}
const bottleRow = (userId: string, b: Bottle) => ({
  id: b.id, user_id: userId, cellar_id: b.cellarId, name: b.name, producer: b.producer,
  vintage: String(b.vintage), region: b.region, area: b.area, country: b.country, colour: b.colour,
  status: b.status, quantity: b.quantity, unit: b.unit, paid: b.paid ?? null, format: b.format,
  grapes: b.grapes, score: b.score, rating: b.rating, drink_from: b.drinkFrom ?? null,
  drink_to: b.drinkTo ?? null, note: b.note, location: b.location ?? null, buy_again: !!b.buyAgain,
  market_unit: b.marketUnit ?? null, market_low: b.marketLow ?? null, market_high: b.marketHigh ?? null,
  market_source: b.marketSource ?? null, market_as_of: b.marketAsOf ?? null, market_read: b.marketRead ?? null,
})
const drinkRow = (userId: string, r: Drink) => ({
  id: r.id, user_id: userId, bottle_id: r.bottleId || null, cellar_id: r.cellarId, name: r.name,
  producer: r.producer, vintage: String(r.vintage), region: r.region, area: r.area, colour: r.colour,
  format: r.format, drink_from: r.drinkFrom ?? null, drink_to: r.drinkTo ?? null, date: r.date,
  occasion: r.occasion, companions: r.companions, rating: r.rating, note: r.note, buy_again: !!r.buyAgain,
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
  region: r.region, area: r.area, country: r.country, colour: r.colour, status: r.status,
  quantity: r.quantity, unit: Number(r.unit), paid: r.paid == null ? undefined : Number(r.paid),
  format: r.format, grapes: r.grapes || [], score: r.score, rating: r.rating,
  drinkFrom: r.drink_from ?? undefined, drinkTo: r.drink_to ?? undefined, note: r.note || '',
  location: r.location ?? undefined, buyAgain: !!r.buy_again,
  marketUnit: r.market_unit == null ? undefined : Number(r.market_unit),
  marketLow: r.market_low == null ? undefined : Number(r.market_low),
  marketHigh: r.market_high == null ? undefined : Number(r.market_high),
  marketSource: r.market_source ?? undefined, marketAsOf: r.market_as_of ?? undefined, marketRead: r.market_read ?? undefined,
})
const drinkFromRow = (r: any): Drink => ({
  id: r.id, bottleId: r.bottle_id || '', cellarId: r.cellar_id, name: r.name, producer: r.producer,
  vintage: parseVintage(r.vintage), region: r.region, area: r.area, colour: r.colour, format: r.format,
  drinkFrom: r.drink_from ?? undefined, drinkTo: r.drink_to ?? undefined, date: r.date,
  occasion: r.occasion, companions: r.companions || '', rating: r.rating || 0, note: r.note || '', buyAgain: !!r.buy_again,
})
const wishFromRow = (r: any): Wish => ({
  id: r.id, name: r.name, producer: r.producer || '', region: r.region || '', vintage: r.vintage || '',
  targetPrice: r.target_price == null ? null : Number(r.target_price), priority: r.priority || 'medium', note: r.note || '',
})

/** Load a user's full dataset. Returns null when the user has no profile yet
 * (a fresh account that still needs onboarding). */
export async function pullUserData(userId: string): Promise<PersistData | null> {
  const [profile, cellars, bottles, drinks, wishlist, collections, snapshots] = await Promise.all([
    db.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    db.from('cellars').select('*').eq('user_id', userId).order('position'),
    db.from('bottles').select('*').eq('user_id', userId),
    db.from('drinks').select('*').eq('user_id', userId),
    db.from('wishlist').select('*').eq('user_id', userId),
    db.from('custom_collections').select('*').eq('user_id', userId),
    db.from('valuation_snapshots').select('day,total,invested,bottles').eq('user_id', userId).order('day', { ascending: true }).limit(1100),
  ])
  const p = profile.data
  if (!p) return null
  return {
    account: { name: p.name || 'Your Cellar', email: p.email || '', plan: p.plan || 'Connoisseur' },
    settings: {
      reminders: !!p.reminders, weekly: !!p.weekly, autoValue: !!p.auto_value,
      priceCadence: p.price_cadence || 'monthly', share: !!p.share, household: !!p.household,
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
    portfolioNote: p.portfolio_note ? { text: p.portfolio_note, asOf: p.portfolio_note_at || '' } : null,
  }
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
