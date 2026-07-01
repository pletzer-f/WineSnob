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
