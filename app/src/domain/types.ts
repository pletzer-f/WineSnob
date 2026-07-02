// The WineSnob domain model. Mirrors the shape used across the app and the
// Supabase schema. Ported from the design prototype's state model.

export type WineColour = 'red' | 'white' | 'rose' | 'sparkling' | 'fortified'
export type DrinkStatus = 'ready' | 'cellaring' | 'past'
export type FormatKey =
  | 'half'
  | 'standard'
  | 'magnum'
  | 'jeroboam'
  | 'rehoboam'
  | 'methuselah'
  | 'salmanazar'
  | 'balthazar'
  | 'nebuchadnezzar'
export type Currency = 'EUR' | 'USD' | 'GBP'
export type Priority = 'grail' | 'high' | 'medium'
export type PriceCadence = 'monthly' | 'quarterly'
export type ViewMode = 'grid' | 'list'
export type Measure = 'value' | 'bottles'
export type CollectingGoal = 'drink' | 'invest' | 'both'

/** A vintage year, or 'NV' for non-vintage. */
export type Vintage = number | 'NV'

/** Occasion recorded when a pour is logged. */
export type OccasionKey =
  | 'dinner'
  | 'celebration'
  | 'everyday'
  | 'restaurant'
  | 'gift-given'
  | 'tasting'

export interface Cellar {
  id: string
  name: string
}

export interface Bottle {
  id: string
  cellarId: string
  name: string
  producer: string
  vintage: Vintage
  region: string
  /** Coarse region used for grouping / top-region stats (e.g. "Bordeaux"). */
  area: string
  country: string
  colour: WineColour
  status: DrinkStatus
  quantity: number
  /** Current market value per standard (750 ml) bottle. */
  unit: number
  /** Price paid per bottle, if recorded. */
  paid?: number
  format: FormatKey
  grapes: string[]
  /** 100-point critic score, 0 when unknown. */
  score: number
  /** Personal rating, 0..5. */
  rating: number
  drinkFrom?: number
  drinkTo?: number
  note: string
  location?: string
  buyAgain?: boolean
  /** Live market price per standard bottle from a price source. Preferred over
   * `unit` for valuation when present; null until a price source is connected. */
  marketUnit?: number
  marketLow?: number
  marketHigh?: number
  /** Provider display name, e.g. "Wine-Searcher". */
  marketSource?: string
  /** ISO date the market price was fetched. */
  marketAsOf?: string
  /** One-line AI market read (trading strength, hold/drink/sell). */
  marketRead?: string
}

export interface Drink {
  id: string
  bottleId: string
  cellarId: string
  name: string
  producer: string
  vintage: Vintage
  region: string
  area: string
  colour: WineColour
  format: FormatKey
  drinkFrom?: number
  drinkTo?: number
  /** ISO date, yyyy-mm-dd. */
  date: string
  occasion: OccasionKey
  companions: string
  rating: number
  note: string
  buyAgain: boolean
}

export interface Wish {
  id: string
  name: string
  producer: string
  region: string
  /** Free text: "2019", "NV", or empty. */
  vintage: string
  targetPrice: number | null
  priority: Priority
  note: string
}

export interface CustomCollection {
  id: string
  title: string
  desc: string
  ids: string[]
}

export interface Settings {
  reminders: boolean
  weekly: boolean
  autoValue: boolean
  priceCadence: PriceCadence
  share: boolean
  household: boolean
  currency: Currency
  defaultView: ViewMode
}

export interface Account {
  name: string
  email: string
  plan: string
}
