import type {
  Account,
  Bottle,
  Cellar,
  CustomCollection,
  Drink,
  Measure,
  Settings,
  ViewMode,
  Wish,
} from '@/domain/types'
import type { BottlePrice, Snapshot } from '@/domain/portfolio'

/** The persisted portion of the store — one user's whole dataset. */
export interface PersistData {
  cellars: Cellar[]
  activeCellar: string
  bottles: Bottle[]
  drinks: Drink[]
  wishlist: Wish[]
  customCollections: CustomCollection[]
  settings: Settings
  account: Account
  statKeys: string[]
  logStatKeys: string[]
  view: ViewMode
  measure: Measure
  onboarded: boolean
  /** Daily history of the cellar's worth (powers the portfolio chart). */
  snapshots?: Snapshot[]
  /** Per-bottle price history from valuations (powers time-ranged movers). */
  bottlePrices?: BottlePrice[]
  /** AI desk note with its as-of date and the figures it was written against. */
  portfolioNote?: { text: string; asOf: string; value?: number; drinks?: number } | null
}

const KEY = 'winesnob:snapshot:v1'

/**
 * Local snapshot persistence. Used for demo mode and as an offline cache.
 * When signed in to Supabase, the repository (data/repo.ts) is the source of
 * truth and mirrors here for fast reloads.
 */
export function loadLocalSnapshot(): PersistData | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PersistData) : null
  } catch {
    return null
  }
}

export function saveLocalSnapshot(data: PersistData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage full or unavailable — non-fatal
  }
}

export function clearLocalSnapshot(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
