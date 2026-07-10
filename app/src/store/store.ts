import { create } from 'zustand'
import { askSommelier, valueCellar, type SomPick } from '@/data/ai'
import { hasSupabase } from '@/lib/supabase'
import { bottleValue, unitValueNow } from '@/domain/valuation'
import { allocation, costBasis, movers, totalReturn, type BottlePrice, type Snapshot } from '@/domain/portfolio'
import type {
  Account,
  Bottle,
  Cellar,
  CollectingGoal,
  Currency,
  CustomCollection,
  Drink,
  DrinkStatus,
  FormatKey,
  Measure,
  OccasionKey,
  Priority,
  Settings,
  ViewMode,
  Vintage,
  WineColour,
} from '@/domain/types'
import { detectDup } from '@/domain/wine'
import { uid } from '@/lib/id'
import { todayISO } from '@/lib/date'
import {
  seedBottles,
  seedCellars,
  seedCustomCollections,
  seedDrinks,
  seedBottlePrices,
  seedPortfolioNote,
  seedSnapshots,
  seedWishlist,
} from './seed'
import {
  clearLocalSnapshot,
  loadLocalSnapshot,
  saveLocalSnapshot,
  type PersistData,
} from '@/data/sync'
import type { Wish } from '@/domain/types'

export type Screen =
  | 'cellar'
  | 'detail'
  | 'add'
  | 'edit'
  | 'stats'
  | 'collections'
  | 'wishlist'
  | 'notes'
  | 'settings'
  | 'log'

export type AddStep = 'capture' | 'import' | 'processing' | 'review'
export type CaptureMode = 'label' | 'case' | 'voice'
export type ObStep = 'auth' | 'welcome' | 'account' | 'profile' | 'first'
export type AuthMode = 'signin' | 'signup'

export interface CapturedRead {
  name: string
  producer: string
  vintage: number | string
  region: string
  colour: WineColour
  confidence: 'high' | 'medium' | 'low'
  quantity: number
  location: string
  unit: number | string
  dupId: string | null
  dupName: string
  dupQty: number
  dupMode: 'merge' | 'new' | null
}

export interface EditForm {
  name: string
  producer: string
  colour: WineColour
  vintage: string
  region: string
  quantity: number
  unit: string
  paid: string
  format: FormatKey
  status: DrinkStatus
  rating: number
  note: string
}

export interface EditErrors {
  name?: string
  vintage?: string
}

export interface WishForm {
  name: string
  producer: string
  region: string
  vintage: string
  targetPrice: string
  priority: Priority
  note: string
  error?: boolean
}

export interface CollForm {
  title: string
  desc: string
  ids: string[]
  error?: boolean
}

export interface SomTurn {
  role: 'user' | 'sommelier'
  text: string
  image?: string | null
  picks?: SomPick[]
  quickReplies?: string[]
  /** The raw structured JSON the model produced, replayed on later turns. */
  raw?: string
  error?: boolean
}

export interface DrinkForm {
  date: string
  occasion: OccasionKey
  companions: string
  rating: number
  note: string
  buyAgain: boolean
}

const DEFAULT_SETTINGS: Settings = {
  reminders: true,
  weekly: false,
  autoValue: true,
  priceCadence: 'monthly',
  share: false,
  household: false,
  currency: 'EUR',
  defaultView: 'grid',
}

const DEFAULT_ACCOUNT: Account = {
  name: 'Your Cellar',
  email: 'you@winesnob.app',
  plan: 'Connoisseur',
}

export interface StoreState {
  // session
  userId: string | null
  ready: boolean

  // navigation
  screen: Screen
  selectedId: string | null

  // cellars
  cellars: Cellar[]
  activeCellar: string
  cellarSwitchOpen: boolean
  cellarManageOpen: boolean

  // collection view
  collection: string | null

  // cellar list controls
  view: ViewMode
  query: string
  filters: string[]
  sortBy: string
  groupBy: string
  regionFilter: string
  filtersOpen: boolean

  // data
  bottles: Bottle[]
  drinks: Drink[]
  wishlist: Wish[]
  customCollections: CustomCollection[]
  settings: Settings
  account: Account

  // dashboards
  statKeys: string[]
  logStatKeys: string[]
  statsModal: boolean
  logStatsModal: boolean
  measure: Measure

  // add flow
  addStep: AddStep
  addMode: CaptureMode
  captured: CapturedRead[]
  processCurrent: number
  reviewExpanded: Record<number, boolean>
  shutterOn: boolean
  aiError: string | null

  // edit form
  editId: string | null
  editFrom: 'detail' | 'add' | 'cellar'
  form: EditForm
  errors: EditErrors

  // sommelier
  somOpen: boolean
  somSeed: string | null
  somTurns: SomTurn[]
  somBusy: boolean

  // valuation
  valuationBusy: boolean
  valuationConfigured: boolean | null
  valuationInfo: { asOf?: string; source?: string; matched?: number; total?: number } | null

  // portfolio
  snapshots: Snapshot[]
  bottlePrices: BottlePrice[]
  portfolioNote: { text: string; asOf: string; value?: number; drinks?: number } | null
  deskNoteBusy: boolean

  // admin console
  adminOpen: boolean

  // password recovery (set when a reset link opens the app)
  pwRecovery: boolean

  // wishlist form
  wishOpen: boolean
  wishEditId: string | null
  wishForm: WishForm

  // custom collections
  collEditOpen: boolean
  collEditId: string | null
  collForm: CollForm
  addToCollOpen: boolean
  addToCollBottleId: string | null

  // drink log
  drinkLogOpen: boolean
  drinkLogId: string | null
  drinkForm: DrinkForm

  // account
  accountOpen: boolean
  accountForm: { name: string; email: string }
  signOutOpen: boolean

  // onboarding
  onboarded: boolean
  obStep: ObStep
  authMode: AuthMode
  obAccount: { name: string; currency: Currency; measure: Measure }
  obProfile: { cellarName: string; colours: string[]; goal: CollectingGoal }

  // toast
  toast: string | null
}

export interface StoreActions {
  // lifecycle
  hydrate: (data: PersistData) => void
  onSignedIn: (userId: string, email: string) => void
  onSignedOut: () => void
  loadSampleCellar: () => void

  // navigation
  go: (key: Screen | string) => void
  openBottle: (b: Bottle) => void
  openBottleById: (id: string) => void
  goCellar: () => void
  goNotes: () => void

  // toast
  flash: (msg: string, ms?: number) => void
  clearToast: () => void

  // cellars
  setActiveCellar: (id: string) => void
  selectAllCellars: () => void
  openCellarSwitch: () => void
  closeCellarSwitch: () => void
  openCellarManage: () => void
  closeCellarManage: () => void
  renameCellar: (id: string, name: string) => void
  addCellar: () => void
  removeCellar: (id: string) => void

  // cellar list controls
  setQuery: (q: string) => void
  toggleFilter: (key: string) => void
  setSort: (v: string) => void
  setGroup: (key: string) => void
  setRegionFilter: (v: string) => void
  setView: (v: ViewMode) => void
  toggleFiltersPanel: () => void
  clearAllFilters: () => void

  // collections nav
  openCollection: (key: string) => void
  openCustomCollection: (id: string) => void
  clearCollection: () => void

  // stat pickers
  openStats: () => void
  closeStats: () => void
  toggleStat: (key: string, checked: boolean) => void
  openLogStats: () => void
  closeLogStats: () => void
  toggleLogStat: (key: string, checked: boolean) => void
  setMeasure: (m: Measure) => void

  // sommelier
  openSommelier: (seed?: string) => void
  closeSommelier: () => void
  resetSommelier: () => void
  somPush: (t: SomTurn) => void
  setSomBusy: (b: boolean) => void
  consumeSomSeed: () => string | null

  // valuation
  refreshValuations: (force?: boolean) => Promise<void>

  // portfolio
  recordSnapshot: () => void
  refreshDeskNote: () => Promise<void>
  /** Regenerate the desk note when the figures it cites have moved. */
  ensureDeskNoteFresh: () => void

  // admin console
  openAdmin: () => void
  closeAdmin: () => void

  // password recovery
  clearPwRecovery: () => void

  // edit form
  openManual: () => void
  openEdit: (b: Bottle) => void
  setField: <K extends keyof EditForm>(k: K, v: EditForm[K]) => void
  editCancel: () => void
  saveBottle: () => void
  deleteBottle: () => void

  // add flow
  setMode: (mode: CaptureMode) => void
  goImport: () => void
  backToCapture: () => void
  startProcessing: () => void
  ingestReads: (reads: RawRead[], intervalMs?: number) => void
  onImportFiles: () => void
  updateCaptured: (i: number, patch: Partial<CapturedRead>) => void
  setCapturedQty: (i: number, v: number) => void
  setDupMode: (i: number, mode: 'merge' | 'new') => void
  toggleReviewRow: (i: number) => void
  discardCaptured: (i: number) => void
  confirmBatch: () => void
  setAiError: (msg: string | null) => void

  // wishlist
  removeWish: (id: string) => void
  openNewWish: () => void
  openEditWish: (id: string) => void
  closeWish: () => void
  setWishField: <K extends keyof WishForm>(k: K, v: WishForm[K]) => void
  saveWish: () => void
  deleteWish: () => void
  wishFromBuyAgain: (e: { name: string; producer?: string; region?: string; vintage?: unknown }) => void

  // custom collections
  openNewCollection: () => void
  openEditCollection: (id: string) => void
  closeCollEdit: () => void
  setCollField: <K extends keyof CollForm>(k: K, v: CollForm[K]) => void
  toggleCollMember: (bottleId: string) => void
  saveCollection: () => void
  deleteCollection: () => void
  openAddToColl: (bottleId: string) => void
  closeAddToColl: () => void
  toggleBottleInColl: (collId: string) => void
  addToCollNew: () => void

  // drink log
  openDrinkLog: (id: string) => void
  closeDrinkLog: () => void
  setDrinkField: <K extends keyof DrinkForm>(k: K, v: DrinkForm[K]) => void
  saveDrink: () => void
  quickDrink: () => void
  toggleBuyAgain: (id: string) => void

  // settings + account
  toggleSetting: (key: keyof Settings, checked: boolean) => void
  setCurrency: (c: Currency) => void
  setCadence: (c: 'weekly' | 'monthly' | 'quarterly') => void
  setDefaultView: (v: ViewMode) => void
  openAccount: () => void
  closeAccount: () => void
  setAccountField: (k: 'name' | 'email', v: string) => void
  saveAccount: () => void
  openSignOut: () => void
  closeSignOut: () => void

  // onboarding
  toggleAuthMode: () => void
  startOnboarding: () => void
  demoReturning: () => void
  obStart: () => void
  obBack: () => void
  obNext: () => void
  setObAccount: (patch: Partial<StoreState['obAccount']>) => void
  setObProfile: (patch: Partial<StoreState['obProfile']>) => void
  toggleObColour: (key: string) => void
  finishOnboarding: (dest: 'snap' | 'manual' | 'import' | 'later') => void
  replayOnboarding: () => void
}

export type Store = StoreState & StoreActions & { _persist: () => void }

/** A raw AI/import read before enrichment. */
export interface RawRead {
  name: string
  producer?: string
  vintage: number | string
  region?: string
  colour?: WineColour
  confidence?: 'high' | 'medium' | 'low'
  unit?: number | string
}

function blankForm(): EditForm {
  return {
    name: '',
    producer: '',
    colour: 'red',
    vintage: '',
    region: '',
    quantity: 1,
    unit: '',
    paid: '',
    format: 'standard',
    status: 'cellaring',
    rating: 0,
    note: '',
  }
}

function formFromBottle(b: Bottle): EditForm {
  return {
    name: b.name,
    producer: b.producer === 'Unknown producer' ? '' : b.producer,
    colour: b.colour,
    vintage: String(b.vintage || ''),
    region: b.region,
    quantity: b.quantity,
    unit: String(b.unit || ''),
    paid: b.paid != null ? String(b.paid) : '',
    format: b.format || 'standard',
    status: b.status,
    rating: b.rating || (b.score ? Math.max(1, Math.round(b.score / 20)) : 0),
    note: b.note || '',
  }
}

function emptyWishForm(): WishForm {
  return { name: '', producer: '', region: '', vintage: '', targetPrice: '', priority: 'medium', note: '' }
}

function enrichRead(r: RawRead, cellar: Bottle[]): CapturedRead {
  const dup = detectDup({ name: r.name, vintage: r.vintage }, cellar)
  return {
    name: r.name.replace(/: label unclear$/, ''),
    producer: r.producer || '',
    vintage: r.vintage,
    region: r.region || '',
    colour: r.colour || 'red',
    confidence: r.confidence || 'high',
    quantity: 1,
    location: '',
    unit: r.unit ?? '',
    dupId: dup ? dup.id : null,
    dupName: dup ? dup.name : '',
    dupQty: dup ? dup.quantity : 0,
    dupMode: dup ? 'merge' : null,
  }
}

function snapshot(s: StoreState): PersistData {
  return {
    cellars: s.cellars,
    activeCellar: s.activeCellar,
    bottles: s.bottles,
    drinks: s.drinks,
    wishlist: s.wishlist,
    customCollections: s.customCollections,
    settings: s.settings,
    account: s.account,
    statKeys: s.statKeys,
    logStatKeys: s.logStatKeys,
    view: s.view,
    measure: s.measure,
    onboarded: s.onboarded,
    snapshots: s.snapshots,
    bottlePrices: s.bottlePrices,
    portfolioNote: s.portfolioNote,
  }
}

// ---- remote sync hook (wired to Supabase in data/repo.ts) ----
let remoteSync: ((userId: string, data: PersistData) => void) | null = null

// Snapshot sink: history rows are written directly (append-only) rather than
// through the whole-snapshot sync. Registered by data/repo.ts.
let snapshotSink: ((userId: string, snap: Snapshot, currency: string) => void) | null = null
export function setSnapshotSink(fn: ((userId: string, snap: Snapshot, currency: string) => void) | null) {
  snapshotSink = fn
}

// Per-bottle price history sink (same direct, append-only pattern).
let priceSink: ((userId: string, rows: BottlePrice[]) => void) | null = null
export function setPriceSink(fn: ((userId: string, rows: BottlePrice[]) => void) | null) {
  priceSink = fn
}
export function setRemoteSync(fn: ((userId: string, data: PersistData) => void) | null) {
  remoteSync = fn
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

const initialState: StoreState = {
  userId: null,
  ready: false,
  screen: 'cellar',
  selectedId: null,
  cellars: seedCellars(),
  activeCellar: 'main',
  cellarSwitchOpen: false,
  cellarManageOpen: false,
  collection: null,
  view: 'grid',
  query: '',
  filters: [],
  sortBy: 'recent',
  groupBy: 'none',
  regionFilter: 'all',
  filtersOpen: false,
  bottles: [],
  drinks: [],
  wishlist: [],
  customCollections: [],
  settings: { ...DEFAULT_SETTINGS },
  account: { ...DEFAULT_ACCOUNT },
  statKeys: ['bottles', 'value', 'ready', 'regions'],
  logStatKeys: ['opened', 'regions', 'fav', 'top'],
  statsModal: false,
  logStatsModal: false,
  measure: 'bottles',
  addStep: 'capture',
  addMode: 'label',
  captured: [],
  processCurrent: 0,
  reviewExpanded: {},
  shutterOn: false,
  aiError: null,
  editId: null,
  editFrom: 'cellar',
  form: blankForm(),
  errors: {},
  somOpen: false,
  somSeed: null,
  somTurns: [],
  somBusy: false,
  valuationBusy: false,
  valuationConfigured: null,
  valuationInfo: null,
  snapshots: [],
  bottlePrices: [],
  portfolioNote: null,
  deskNoteBusy: false,
  adminOpen: false,
  pwRecovery: false,
  wishOpen: false,
  wishEditId: null,
  wishForm: emptyWishForm(),
  collEditOpen: false,
  collEditId: null,
  collForm: { title: '', desc: '', ids: [] },
  addToCollOpen: false,
  addToCollBottleId: null,
  drinkLogOpen: false,
  drinkLogId: null,
  drinkForm: { date: '', occasion: 'dinner', companions: '', rating: 0, note: '', buyAgain: false },
  accountOpen: false,
  accountForm: { name: '', email: '' },
  signOutOpen: false,
  onboarded: false,
  obStep: 'auth',
  authMode: 'signin',
  obAccount: { name: '', currency: 'EUR', measure: 'value' },
  obProfile: { cellarName: '', colours: [], goal: 'drink' },
  toast: null,
}

export const useStore = create<Store>((set, get) => {
  const firstCellarId = () => {
    const cs = get().cellars
    return cs.length ? cs[0].id : 'main'
  }
  const attachCellarId = () => {
    const { activeCellar } = get()
    return activeCellar && activeCellar !== 'all' ? activeCellar : firstCellarId()
  }

  return {
    ...initialState,

    _persist: () => {
      if (persistTimer) clearTimeout(persistTimer)
      persistTimer = setTimeout(() => {
        const s = get()
        const data = snapshot(s)
        saveLocalSnapshot(data)
        if (s.userId && remoteSync) remoteSync(s.userId, data)
      }, 350)
    },

    // ---- lifecycle ----
    hydrate: (data) => {
      set({
        cellars: data.cellars?.length ? data.cellars : seedCellars(),
        activeCellar: data.activeCellar || 'main',
        bottles: data.bottles || [],
        drinks: data.drinks || [],
        wishlist: data.wishlist || [],
        customCollections: data.customCollections || [],
        settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
        account: { ...DEFAULT_ACCOUNT, ...(data.account || {}) },
        statKeys: data.statKeys?.length ? data.statKeys : initialState.statKeys,
        logStatKeys: data.logStatKeys?.length ? data.logStatKeys : initialState.logStatKeys,
        view: data.view || 'grid',
        measure: data.measure || 'bottles',
        onboarded: !!data.onboarded,
        snapshots: data.snapshots || [],
        bottlePrices: data.bottlePrices || [],
        portfolioNote: data.portfolioNote || null,
        ready: true,
      })
    },
    onSignedIn: (userId, email) => {
      set((s) => ({ userId, account: { ...s.account, email: email || s.account.email } }))
    },
    onSignedOut: () => {
      clearLocalSnapshot()
      if (persistTimer) clearTimeout(persistTimer)
      set({ ...initialState, ready: true })
    },
    loadSampleCellar: () => {
      set({
        cellars: seedCellars(),
        bottles: seedBottles(),
        drinks: seedDrinks(),
        wishlist: seedWishlist(),
        customCollections: seedCustomCollections(),
        activeCellar: 'main',
        onboarded: true,
        screen: 'cellar',
        snapshots: seedSnapshots(),
        bottlePrices: seedBottlePrices(),
        portfolioNote: seedPortfolioNote(),
      })
      get()._persist()
      get().flash('Sample cellar loaded')
    },

    // ---- navigation ----
    go: (key) =>
      set(
        key === 'add'
          ? { screen: 'add', addStep: 'capture', collection: null }
          : { screen: key as Screen, collection: null },
      ),
    openBottle: (b) => set({ screen: 'detail', selectedId: b.id }),
    openBottleById: (id) => set({ screen: 'detail', selectedId: id }),
    goCellar: () => get().go('cellar'),
    goNotes: () => get().go('notes'),

    // ---- toast ----
    flash: (msg, ms = 2800) => {
      set({ toast: msg })
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => set({ toast: null }), ms)
    },
    clearToast: () => set({ toast: null }),

    // ---- cellars ----
    setActiveCellar: (id) => {
      set({ activeCellar: id, cellarSwitchOpen: false, collection: null })
      get()._persist()
    },
    selectAllCellars: () => get().setActiveCellar('all'),
    openCellarSwitch: () => set({ cellarSwitchOpen: true }),
    closeCellarSwitch: () => set({ cellarSwitchOpen: false }),
    openCellarManage: () => set({ cellarManageOpen: true, cellarSwitchOpen: false }),
    closeCellarManage: () => set({ cellarManageOpen: false }),
    renameCellar: (id, name) => {
      set((s) => ({ cellars: s.cellars.map((c) => (c.id === id ? { ...c, name } : c)) }))
      get()._persist()
    },
    addCellar: () => {
      const s = get()
      if (s.cellars.length >= 3) {
        get().flash('Three cellars is the limit for now', 2600)
        return
      }
      const id = uid('cellar')
      set({ cellars: [...s.cellars, { id, name: 'New Cellar' }], activeCellar: id })
      get().flash('Cellar added. Give it a name.', 2600)
      get()._persist()
    },
    removeCellar: (id) => {
      const s = get()
      if (s.cellars.length <= 1) {
        get().flash('You need at least one cellar', 2600)
        return
      }
      const remaining = s.cellars.filter((c) => c.id !== id)
      const fallback = remaining[0].id
      const bottles = s.bottles.map((b) => ((b.cellarId || 'main') === id ? { ...b, cellarId: fallback } : b))
      const drinks = s.drinks.map((r) => ((r.cellarId || 'main') === id ? { ...r, cellarId: fallback } : r))
      const activeCellar = s.activeCellar === id ? fallback : s.activeCellar
      set({ cellars: remaining, bottles, drinks, activeCellar })
      get().flash(`Cellar removed. Its bottles moved to ${remaining[0].name}`)
      get()._persist()
    },

    // ---- cellar list controls ----
    setQuery: (q) => set({ query: q }),
    toggleFilter: (key) =>
      set((s) => ({ filters: s.filters.includes(key) ? s.filters.filter((k) => k !== key) : [...s.filters, key] })),
    setSort: (v) => set({ sortBy: v }),
    setGroup: (key) => set({ groupBy: key }),
    setRegionFilter: (v) => set({ regionFilter: v }),
    setView: (v) => set({ view: v }),
    toggleFiltersPanel: () => set((s) => ({ filtersOpen: !s.filtersOpen })),
    clearAllFilters: () => set({ filters: [], regionFilter: 'all', groupBy: 'none' }),

    // ---- collections nav ----
    openCollection: (key) => set({ screen: 'cellar', collection: key }),
    openCustomCollection: (id) => set({ screen: 'cellar', collection: `custom:${id}` }),
    clearCollection: () => set({ collection: null }),

    // ---- stat pickers ----
    openStats: () => set({ statsModal: true }),
    closeStats: () => set({ statsModal: false }),
    toggleStat: (key, checked) => {
      set((s) => {
        let keys = s.statKeys.slice()
        if (checked) {
          if (!keys.includes(key) && keys.length < 6) keys.push(key)
        } else {
          keys = keys.filter((k) => k !== key)
          if (keys.length === 0) keys = [key]
        }
        return { statKeys: keys }
      })
      get()._persist()
    },
    openLogStats: () => set({ logStatsModal: true }),
    closeLogStats: () => set({ logStatsModal: false }),
    toggleLogStat: (key, checked) => {
      set((s) => {
        let keys = s.logStatKeys.slice()
        if (checked) {
          if (!keys.includes(key) && keys.length < 6) keys.push(key)
        } else {
          keys = keys.filter((k) => k !== key)
          if (keys.length === 0) keys = [key]
        }
        return { logStatKeys: keys }
      })
      get()._persist()
    },
    setMeasure: (m) => {
      set({ measure: m })
      get()._persist()
    },

    // ---- sommelier ----
    openSommelier: (seed) => set({ somOpen: true, somSeed: seed || null }),
    closeSommelier: () => set({ somOpen: false }),
    resetSommelier: () => set({ somTurns: [], somBusy: false, somSeed: null }),
    somPush: (t) => set((s) => ({ somTurns: [...s.somTurns, t] })),
    setSomBusy: (b) => set({ somBusy: b }),
    consumeSomSeed: () => {
      const seed = get().somSeed
      if (seed) set({ somSeed: null })
      return seed
    },

    // ---- valuation ----
    refreshValuations: async (force = false) => {
      if (get().valuationBusy) return
      // Manual refresh revalues everything; the automatic pass only touches
      // bottles that have gone stale against the chosen cadence.
      const days = { weekly: 7, monthly: 30, quarterly: 90 }[get().settings.priceCadence] ?? 30
      const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
      const pool = force ? get().bottles : get().bottles.filter((b) => !b.marketAsOf || b.marketAsOf < cutoff)
      const inputs = pool.map((b) => ({
        id: b.id,
        name: b.name,
        producer: b.producer,
        vintage: String(b.vintage),
        region: [b.region, b.area].filter(Boolean).join(', '),
        format: b.format,
      }))
      if (inputs.length === 0) {
        if (force) get().flash(get().bottles.length ? 'Everything is freshly valued' : 'Add a few bottles first')
        return
      }
      set({ valuationBusy: true })
      try {
        const res = await valueCellar(inputs, get().settings.currency)
        if (!res.configured) {
          set({ valuationConfigured: false })
          if (force) get().flash('Valuation is not available just now')
          return
        }
        const map = new Map(res.results.map((r) => [r.id, r]))
        set((state) => ({
          valuationConfigured: true,
          valuationInfo: { asOf: res.asOf, source: res.provider, matched: res.matched, total: res.total },
          bottles: state.bottles.map((b) => {
            const r = map.get(b.id)
            return r ? { ...b, marketUnit: r.unit, marketLow: r.low, marketHigh: r.high, marketSource: r.source, marketAsOf: r.asOf, marketRead: r.read } : b
          }),
        }))
        // Append today's per-bottle prices to the history that powers
        // time-ranged movers.
        const day = todayISO()
        const priceRows: BottlePrice[] = res.results.map((r) => ({ bottleId: r.id, day, unit: r.unit }))
        if (priceRows.length) {
          set((state) => ({
            bottlePrices: [...state.bottlePrices.filter((p) => !(p.day === day && priceRows.some((n) => n.bottleId === p.bottleId))), ...priceRows],
          }))
          if (get().userId && priceSink) priceSink(get().userId!, priceRows)
        }
        get()._persist()
        get().recordSnapshot()
        void get().refreshDeskNote()
        if (force || res.matched) {
          get().flash(res.matched ? `Valued ${res.matched} of ${res.total} wines via ${res.provider}` : 'No market prices found for your wines')
        }
      } catch (e) {
        console.error('valuation', e)
        if (force) get().flash('Could not refresh valuations just now')
      } finally {
        set({ valuationBusy: false })
      }
    },

    // ---- portfolio ----
    recordSnapshot: () => {
      const s = get()
      if (!s.bottles.length) return
      const day = todayISO()
      let total = 0
      let invested = 0
      let hasPaid = false
      let count = 0
      s.bottles.forEach((b) => {
        total += bottleValue(b)
        count += b.quantity
        if (b.paid != null && b.paid > 0 && b.quantity > 0) {
          invested += b.paid * b.quantity
          hasPaid = true
        }
      })
      const snap: Snapshot = { day, total: Math.round(total), invested: hasPaid ? Math.round(invested) : null, bottles: count }
      set((st) => ({ snapshots: [...st.snapshots.filter((x) => x.day !== day), snap].sort((a, b) => a.day.localeCompare(b.day)) }))
      get()._persist()
      if (s.userId && snapshotSink) snapshotSink(s.userId, snap, s.settings.currency)
    },
    refreshDeskNote: async () => {
      const s = get()
      if (!hasSupabase || !s.bottles.length || s.deskNoteBusy) return
      set({ deskNoteBusy: true })
      try {
        const cb = costBasis(s.bottles)
        const tr = totalReturn(s.bottles, s.drinks)
        const mv = movers(s.bottles, 2)
        const data = {
          currency: s.settings.currency,
          cellarValueNow: Math.round(cb.totalMarket),
          investedAllTime: Math.round(tr.investedAll),
          valueEnjoyedInGlasses: Math.round(tr.enjoyedAll),
          totalReturnPctInclEnjoyed: tr.gainPct == null ? null : Math.round(tr.gainPct * 10) / 10,
          bottlesHeld: s.bottles.reduce((a, b) => a + b.quantity, 0),
          poursLogged: s.drinks.length,
          topGainers: mv.up.map((m) => `${m.name} ${m.vintage} ${m.pct >= 0 ? '+' : ''}${Math.round(m.pct)}%`),
          topLosers: mv.down.map((m) => `${m.name} ${m.vintage} ${Math.round(m.pct)}%`),
          allocation: allocation(s.bottles, 'region', 4).map((a) => `${a.label} ${Math.round(a.pct)}%`),
        }
        const res = await askSommelier(
          [
            {
              role: 'user',
              text: `Write the desk note for my wine portfolio: ONE calm paragraph, at most 45 words. Cover the cellar's current value, the all-in return including bottles already enjoyed (drinking is a withdrawal, never a loss), notable movers and the allocation tilt. No greeting, no questions, no recommendations, no picks, no em dashes. Data: ${JSON.stringify(data)}`,
            },
          ],
          { purpose: 'portfolio desk note' },
        )
        if (res.reply) {
          set({
            portfolioNote: {
              text: res.reply,
              asOf: todayISO(),
              value: Math.round(cb.totalMarket),
              drinks: s.drinks.length,
            },
          })
          get()._persist()
        }
      } catch (e) {
        console.error('desk note', e)
      } finally {
        set({ deskNoteBusy: false })
      }
    },
    ensureDeskNoteFresh: () => {
      const s = get()
      if (!hasSupabase || !s.bottles.length || s.deskNoteBusy) return
      const n = s.portfolioNote
      if (!n) {
        void get().refreshDeskNote()
        return
      }
      const total = Math.round(s.bottles.reduce((a, b) => a + bottleValue(b), 0))
      const valueMoved = n.value != null && n.value > 0 ? Math.abs(total - n.value) / n.value > 0.02 : n.value == null
      const drinksMoved = n.drinks != null && n.drinks !== s.drinks.length
      if (valueMoved || drinksMoved) void get().refreshDeskNote()
    },

    // ---- admin console ----
    openAdmin: () => set({ adminOpen: true }),
    closeAdmin: () => set({ adminOpen: false }),

    // ---- password recovery ----
    clearPwRecovery: () => set({ pwRecovery: false }),

    // ---- edit form ----
    openManual: () => set({ screen: 'edit', editId: null, editFrom: 'add', form: blankForm(), errors: {} }),
    openEdit: (b) => set({ screen: 'edit', editId: b.id, editFrom: 'detail', form: formFromBottle(b), errors: {} }),
    setField: (k, v) => set((s) => ({ form: { ...s.form, [k]: v }, errors: { ...s.errors, [k]: undefined } })),
    editCancel: () =>
      set((s) => ({
        screen: s.editFrom === 'detail' && s.editId ? 'detail' : s.editFrom === 'add' ? 'add' : 'cellar',
      })),
    saveBottle: () => {
      const f = get().form
      const errors: EditErrors = {}
      if (!f.name.trim()) errors.name = 'Give the wine a name.'
      const vRaw = String(f.vintage).trim()
      const isNV = /^nv$/i.test(vRaw)
      if (vRaw && !isNV && !/^\d{4}$/.test(vRaw)) errors.vintage = 'Use a 4-digit year, or NV.'
      if (Object.keys(errors).length) {
        set({ errors })
        return
      }
      const vintage: Vintage = isNV || !vRaw ? (isNV ? 'NV' : 2020) : parseInt(vRaw, 10)
      const unit = parseInt(String(f.unit).replace(/[^\d]/g, ''), 10) || 0
      const paid = String(f.paid).trim() === '' ? undefined : parseInt(String(f.paid).replace(/[^\d]/g, ''), 10) || 0
      const area = f.region ? f.region.split(',').pop()!.trim() : '-'
      const score = f.rating ? f.rating * 20 - (f.rating === 5 ? 2 : 0) : 0

      set((s) => {
        const patch = {
          name: f.name.trim(),
          producer: f.producer.trim() || 'Unknown producer',
          colour: f.colour,
          vintage,
          region: f.region || '-',
          area,
          quantity: f.quantity,
          unit,
          paid,
          format: f.format || 'standard',
          status: f.status,
          rating: f.rating,
          score,
          note: f.note.trim(),
        }
        let bottles: Bottle[]
        let toast: string
        if (s.editId) {
          bottles = s.bottles.map((b) => (b.id === s.editId ? { ...b, ...patch } : b))
          toast = `${patch.name} updated`
        } else {
          const nb: Bottle = {
            id: uid('bottle'),
            cellarId: attachCellarId(),
            country: 'France',
            grapes: [],
            drinkFrom: typeof vintage === 'number' ? vintage + 2 : 2026,
            drinkTo: typeof vintage === 'number' ? vintage + 12 : 2036,
            ...patch,
          }
          bottles = [nb, ...s.bottles]
          toast = `${patch.name} added to your cellar`
        }
        return {
          bottles,
          screen: s.editId ? ('detail' as Screen) : ('cellar' as Screen),
          selectedId: s.editId || s.selectedId,
        }
      })
      get().flash(get().editId ? `${get().form.name.trim()} updated` : `${get().form.name.trim()} added to your cellar`)
      get()._persist()
    },
    deleteBottle: () => {
      set((s) => ({ bottles: s.bottles.filter((b) => b.id !== s.editId), screen: 'cellar', selectedId: null }))
      get().flash('Bottle removed from your cellar')
      get()._persist()
    },

    // ---- add flow ----
    setMode: (mode) => set({ addMode: mode }),
    goImport: () => set({ addStep: 'import' }),
    backToCapture: () => set({ addStep: 'capture', processCurrent: 0 }),
    startProcessing: () => set({ shutterOn: false }),
    setAiError: (msg) => set({ aiError: msg }),
    ingestReads: (reads, intervalMs = 500) => {
      const cellar = get().bottles
      set({ addStep: 'processing', processCurrent: 0, captured: [], aiError: null })
      // brief animated progress, then land on the review step
      const total = Math.max(1, reads.length)
      let n = 0
      const tick = () => {
        n += 1
        if (n >= total) {
          const enriched = reads.map((r) => enrichRead(r, cellar))
          const expanded: Record<number, boolean> = {}
          enriched.forEach((r, i) => {
            if (r.confidence !== 'high') expanded[i] = true
          })
          set({ processCurrent: total, addStep: 'review', captured: enriched, reviewExpanded: expanded })
          return
        }
        set({ processCurrent: n })
        setTimeout(tick, intervalMs)
      }
      setTimeout(tick, intervalMs)
    },
    onImportFiles: () => {
      // Placeholder until the parse-import Edge Function is wired in.
      get().flash('Reading your list…', 1800)
    },
    updateCaptured: (i, patch) =>
      set((s) => ({ captured: s.captured.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) })),
    setCapturedQty: (i, v) => get().updateCaptured(i, { quantity: v }),
    setDupMode: (i, mode) => get().updateCaptured(i, { dupMode: mode }),
    toggleReviewRow: (i) =>
      set((s) => {
        const ex = { ...s.reviewExpanded }
        if (ex[i]) delete ex[i]
        else ex[i] = true
        return { reviewExpanded: ex }
      }),
    discardCaptured: (i) =>
      set((s) => {
        const captured = s.captured.filter((_, idx) => idx !== i)
        if (captured.length === 0) return { captured, addStep: 'capture', reviewExpanded: {} }
        const ex: Record<number, boolean> = {}
        Object.keys(s.reviewExpanded).forEach((k) => {
          const nn = Number(k)
          if (nn < i) ex[nn] = true
          else if (nn > i) ex[nn - 1] = true
        })
        return { captured, reviewExpanded: ex }
      }),
    confirmBatch: () => {
      set((s) => {
        let bottles = s.bottles.slice()
        let mergedCount = 0
        const added: Bottle[] = []
        s.captured.forEach((r) => {
          const qty = Math.max(1, r.quantity || 1)
          const unit = r.unit === '' || r.unit == null ? 100 : parseFloat(String(r.unit)) || 100
          if (r.dupId && r.dupMode === 'merge') {
            bottles = bottles.map((b) => (b.id === r.dupId ? { ...b, quantity: b.quantity + qty } : b))
            mergedCount += 1
            return
          }
          const vintage = typeof r.vintage === 'number' ? r.vintage : parseInt(String(r.vintage), 10) || 2020
          const status: DrinkStatus = vintage <= 2018 ? 'ready' : 'cellaring'
          added.push({
            id: uid('bottle'),
            cellarId: attachCellarId(),
            name: r.name || 'Unknown wine',
            producer: r.producer || 'Unknown producer',
            vintage,
            region: r.region || '-',
            area: (r.region || '').split(',').pop()!.trim() || r.region || '-',
            country: 'France',
            colour: r.colour || 'red',
            status,
            quantity: qty,
            unit,
            paid: undefined,
            format: 'standard',
            location: r.location || '',
            grapes: [],
            score: 0,
            rating: 0,
            drinkFrom: vintage + 2,
            drinkTo: vintage + 12,
            note: '',
          })
        })
        const nNew = added.length
        const parts: string[] = []
        if (nNew) parts.push(`${nNew} ${nNew === 1 ? 'bottle' : 'bottles'} added`)
        if (mergedCount) parts.push(`${mergedCount} merged into your cellar`)
        const toast = parts.length ? parts.join(' · ') : 'Cellar updated'
        return {
          bottles: [...added, ...bottles],
          screen: 'cellar' as Screen,
          addStep: 'capture' as AddStep,
          processCurrent: 0,
          captured: [],
          reviewExpanded: {},
          toast,
        }
      })
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => set({ toast: null }), 2800)
      get()._persist()
    },

    // ---- wishlist ----
    removeWish: (id) => {
      set((s) => ({ wishlist: s.wishlist.filter((w) => w.id !== id) }))
      get().flash('Removed from your wishlist')
      get()._persist()
    },
    openNewWish: () => set({ wishOpen: true, wishEditId: null, wishForm: emptyWishForm() }),
    openEditWish: (id) =>
      set((s) => {
        const w = s.wishlist.find((x) => x.id === id)
        return {
          wishOpen: true,
          wishEditId: id,
          wishForm: w
            ? {
                name: w.name,
                producer: w.producer || '',
                region: w.region || '',
                vintage: w.vintage || '',
                targetPrice: w.targetPrice != null ? String(w.targetPrice) : '',
                priority: w.priority || 'medium',
                note: w.note || '',
              }
            : emptyWishForm(),
        }
      }),
    closeWish: () => set({ wishOpen: false }),
    setWishField: (k, v) => set((s) => ({ wishForm: { ...s.wishForm, [k]: v } })),
    saveWish: () => {
      const f = get().wishForm
      const name = (f.name || '').trim()
      if (!name) {
        set((s) => ({ wishForm: { ...s.wishForm, error: true } }))
        return
      }
      const tp = parseInt(String(f.targetPrice).replace(/[^\d]/g, ''), 10)
      const rec = {
        name,
        producer: (f.producer || '').trim(),
        region: (f.region || '').trim(),
        vintage: (f.vintage || '').trim(),
        targetPrice: isNaN(tp) ? null : tp,
        priority: f.priority || 'medium',
        note: (f.note || '').trim(),
      }
      const editing = !!get().wishEditId
      set((s) => {
        let wishlist: Wish[]
        if (s.wishEditId) wishlist = s.wishlist.map((w) => (w.id === s.wishEditId ? { ...w, ...rec } : w))
        else wishlist = [{ id: uid('wish'), ...rec }, ...s.wishlist]
        return { wishlist, wishOpen: false }
      })
      get().flash(editing ? 'Wish updated' : 'Added to your wishlist')
      get()._persist()
    },
    deleteWish: () => {
      set((s) => ({ wishlist: s.wishlist.filter((w) => w.id !== s.wishEditId), wishOpen: false }))
      get().flash('Removed from your wishlist')
      get()._persist()
    },
    wishFromBuyAgain: (e) => {
      const s = get()
      if (s.wishlist.some((w) => (w.name || '').toLowerCase() === (e.name || '').toLowerCase())) {
        get().flash(`${e.name} is already on your wishlist`, 2600)
        return
      }
      const rec: Wish = {
        id: uid('wish'),
        name: e.name,
        producer: e.producer || '',
        region: e.region || '',
        vintage: e.vintage != null ? String(e.vintage) : '',
        targetPrice: null,
        priority: 'high',
        note: 'Loved it. Buy again.',
      }
      set({ wishlist: [rec, ...s.wishlist] })
      get().flash(`${e.name} added to your wishlist`, 2600)
      get()._persist()
    },

    // ---- custom collections ----
    openNewCollection: () => set({ collEditOpen: true, collEditId: null, collForm: { title: '', desc: '', ids: [] } }),
    openEditCollection: (id) =>
      set((s) => {
        const c = s.customCollections.find((x) => x.id === id)
        return {
          collEditOpen: true,
          collEditId: id,
          collForm: c ? { title: c.title, desc: c.desc, ids: [...c.ids] } : { title: '', desc: '', ids: [] },
        }
      }),
    closeCollEdit: () => set({ collEditOpen: false }),
    setCollField: (k, v) => set((s) => ({ collForm: { ...s.collForm, [k]: v } })),
    toggleCollMember: (bottleId) =>
      set((s) => {
        const ids = s.collForm.ids.includes(bottleId)
          ? s.collForm.ids.filter((i) => i !== bottleId)
          : [...s.collForm.ids, bottleId]
        return { collForm: { ...s.collForm, ids } }
      }),
    saveCollection: () => {
      const title = (get().collForm.title || '').trim()
      if (!title) {
        set((s) => ({ collForm: { ...s.collForm, error: true } }))
        return
      }
      const editing = !!get().collEditId
      set((s) => {
        const f = s.collForm
        let list: CustomCollection[]
        if (s.collEditId) {
          list = s.customCollections.map((c) =>
            c.id === s.collEditId ? { ...c, title, desc: (f.desc || '').trim(), ids: f.ids } : c,
          )
        } else {
          list = [{ id: uid('cc'), title, desc: (f.desc || '').trim(), ids: f.ids }, ...s.customCollections]
        }
        return { customCollections: list, collEditOpen: false }
      })
      get().flash(editing ? 'Collection updated' : 'Collection created')
      get()._persist()
    },
    deleteCollection: () => {
      set((s) => ({
        customCollections: s.customCollections.filter((c) => c.id !== s.collEditId),
        collEditOpen: false,
      }))
      get().flash('Collection deleted')
      get()._persist()
    },
    openAddToColl: (bottleId) => set({ addToCollOpen: true, addToCollBottleId: bottleId }),
    closeAddToColl: () => set({ addToCollOpen: false }),
    toggleBottleInColl: (collId) => {
      set((s) => {
        const bid = s.addToCollBottleId
        const list = s.customCollections.map((c) => {
          if (c.id !== collId || !bid) return c
          const has = c.ids.includes(bid)
          return { ...c, ids: has ? c.ids.filter((i) => i !== bid) : [...c.ids, bid] }
        })
        return { customCollections: list }
      })
      get()._persist()
    },
    addToCollNew: () =>
      set((s) => ({
        addToCollOpen: false,
        collEditOpen: true,
        collEditId: null,
        collForm: { title: '', desc: '', ids: s.addToCollBottleId ? [s.addToCollBottleId] : [] },
      })),

    // ---- drink log ----
    openDrinkLog: (id) =>
      set((s) => {
        const b = s.bottles.find((x) => x.id === id)
        return {
          drinkLogOpen: true,
          drinkLogId: id,
          drinkForm: {
            date: todayISO(),
            occasion: 'dinner',
            companions: '',
            rating: b ? b.rating || Math.round((b.score || 0) / 20) : 0,
            note: '',
            buyAgain: false,
          },
        }
      }),
    closeDrinkLog: () => set({ drinkLogOpen: false }),
    setDrinkField: (k, v) => set((s) => ({ drinkForm: { ...s.drinkForm, [k]: v } })),
    saveDrink: () => recordDrink(get().drinkLogId, get().drinkForm),
    quickDrink: () => recordDrink(get().drinkLogId, { date: todayISO(), occasion: 'dinner' }),
    toggleBuyAgain: (id) => {
      const b = get().bottles.find((x) => x.id === id)
      set((s) => ({ bottles: s.bottles.map((x) => (x.id === id ? { ...x, buyAgain: !x.buyAgain } : x)) }))
      get().flash(b && !b.buyAgain ? 'Added to Buy again. Tap again to remove it.' : 'Removed from Buy again', 2600)
      get()._persist()
    },

    // ---- settings + account ----
    toggleSetting: (key, checked) => {
      set((s) => ({ settings: { ...s.settings, [key]: checked } }))
      get()._persist()
    },
    setCurrency: (c) => {
      set((s) => ({ settings: { ...s.settings, currency: c } }))
      get()._persist()
    },
    setCadence: (c) => {
      set((s) => ({ settings: { ...s.settings, priceCadence: c } }))
      get()._persist()
    },
    setDefaultView: (v) => {
      set((s) => ({ settings: { ...s.settings, defaultView: v }, view: v }))
      get()._persist()
    },
    openAccount: () => set((s) => ({ accountOpen: true, accountForm: { name: s.account.name, email: s.account.email } })),
    closeAccount: () => set({ accountOpen: false }),
    setAccountField: (k, v) => set((s) => ({ accountForm: { ...s.accountForm, [k]: v } })),
    saveAccount: () => {
      const f = get().accountForm
      const name = (f.name || '').trim() || 'Your Cellar'
      set((s) => ({ account: { ...s.account, name, email: (f.email || '').trim() }, accountOpen: false }))
      get().flash('Account updated')
      get()._persist()
    },
    openSignOut: () => set({ signOutOpen: true }),
    closeSignOut: () => set({ signOutOpen: false }),

    // ---- onboarding ----
    toggleAuthMode: () => set((s) => ({ authMode: s.authMode === 'signin' ? 'signup' : 'signin' })),
    startOnboarding: () => set({ obStep: 'welcome' }),
    demoReturning: () => {
      set({ onboarded: true, screen: 'cellar' })
      get()._persist()
    },
    obStart: () => set({ obStep: 'account' }),
    obBack: () =>
      set((s) => ({
        obStep: s.obStep === 'profile' ? 'account' : s.obStep === 'first' ? 'profile' : 'welcome',
      })),
    obNext: () => set((s) => ({ obStep: s.obStep === 'account' ? 'profile' : 'first' })),
    setObAccount: (patch) => set((s) => ({ obAccount: { ...s.obAccount, ...patch } })),
    setObProfile: (patch) => set((s) => ({ obProfile: { ...s.obProfile, ...patch } })),
    toggleObColour: (key) =>
      set((s) => {
        const has = s.obProfile.colours.includes(key)
        return {
          obProfile: {
            ...s.obProfile,
            colours: has ? s.obProfile.colours.filter((k) => k !== key) : [...s.obProfile.colours, key],
          },
        }
      }),
    finishOnboarding: (dest) => {
      set((s) => {
        const name = (s.obProfile.cellarName || s.obAccount.name || '').trim() || 'Your Cellar'
        const base = {
          onboarded: true,
          bottles: [] as Bottle[],
          settings: { ...s.settings, currency: s.obAccount.currency },
          measure: s.obAccount.measure,
          account: { ...s.account, name },
        }
        if (dest === 'snap') return { ...base, screen: 'add' as Screen, addStep: 'capture' as AddStep, addMode: 'label' as CaptureMode }
        if (dest === 'manual') return { ...base, screen: 'edit' as Screen, editId: null, editFrom: 'add' as const, form: blankForm(), errors: {} }
        if (dest === 'import') return { ...base, screen: 'add' as Screen, addStep: 'import' as AddStep }
        return { ...base, screen: 'cellar' as Screen }
      })
      get()._persist()
    },
    replayOnboarding: () => set({ onboarded: false, obStep: 'auth', authMode: 'signup' }),
  }
})

// Shared by saveDrink / quickDrink.
function recordDrink(id: string | null, detail?: Partial<DrinkForm>) {
  const s = useStore.getState()
  const b = s.bottles.find((x) => x.id === id)
  if (!b) return
  const bottles = s.bottles.map((x) => (x.id === id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x))
  const left = Math.max(0, b.quantity - 1)
  const rec: Drink = {
    id: uid('drink'),
    bottleId: b.id,
    cellarId: b.cellarId || 'main',
    name: b.name,
    producer: b.producer,
    vintage: b.vintage,
    region: b.region,
    area: b.area,
    colour: b.colour,
    format: b.format || 'standard',
    drinkFrom: b.drinkFrom,
    drinkTo: b.drinkTo,
    date: detail?.date || todayISO(),
    occasion: (detail?.occasion as OccasionKey) || 'dinner',
    companions: detail?.companions || '',
    rating: detail?.rating || 0,
    note: detail?.note || '',
    buyAgain: !!detail?.buyAgain,
    // Capture the realized value and cost at the moment of the pour, so the
    // portfolio treats drinking as a withdrawal rather than a loss.
    valueAtDrink: Math.round(unitValueNow(b)),
    paidAtDrink: b.paid != null && b.paid > 0 ? b.paid : undefined,
  }
  const withBuyAgain = bottles.map((x) => (x.id === id ? { ...x, buyAgain: x.buyAgain || rec.buyAgain } : x))
  useStore.setState({ bottles: withBuyAgain, drinks: [rec, ...s.drinks], drinkLogOpen: false })
  useStore.getState().flash(`Logged one ${b.name}, ${left} ${left === 1 ? 'bottle' : 'bottles'} left`)
  useStore.getState()._persist()
}
