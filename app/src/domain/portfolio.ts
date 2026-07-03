// Portfolio calculators: the broker-style view of a cellar. All pure.

import type { Bottle, Drink } from './types'
import { bottleValue, unitValueNow } from './valuation'

/** One recorded day of cellar worth (the history behind the value chart). */
export interface Snapshot {
  day: string
  total: number
  invested: number | null
  bottles: number
}

export type RangeKey = '1M' | '6M' | '1Y' | 'MAX'
export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '1M', label: '1M', days: 30 },
  { key: '6M', label: '6M', days: 182 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'MAX', label: 'Max', days: null },
]

export interface SeriesPoint {
  day: string
  value: number
}

export interface Series {
  points: SeriesPoint[]
  delta: number
  deltaPct: number | null
}

function shiftDay(today: string, days: number): string {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/** The value series for a chart range, oldest first, plus its change. */
export function seriesFor(snapshots: Snapshot[], range: RangeKey, today: string): Series {
  const def = RANGES.find((r) => r.key === range)
  const cutoff = def?.days != null ? shiftDay(today, def.days) : ''
  const points = snapshots
    .filter((s) => s.day >= cutoff)
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((s) => ({ day: s.day, value: s.total }))
  if (points.length < 2) return { points, delta: 0, deltaPct: null }
  const first = points[0].value
  const last = points[points.length - 1].value
  return { points, delta: last - first, deltaPct: first > 0 ? ((last - first) / first) * 100 : null }
}

/** Invested capital vs market worth, over the bottles with a known cost. */
export interface CostBasis {
  /** Sum of price paid x quantity where a cost is recorded. */
  invested: number
  /** Market worth of those same bottles. */
  marketOfInvested: number
  gain: number
  gainPct: number | null
  /** Market worth of the whole cellar. */
  totalMarket: number
  /** Share of bottles (by count) with a recorded cost, 0..1. */
  coverage: number
}

export function costBasis(bottles: Bottle[]): CostBasis {
  let invested = 0
  let marketOfInvested = 0
  let coveredBottles = 0
  let totalBottles = 0
  let totalMarket = 0
  bottles.forEach((b) => {
    totalBottles += b.quantity
    totalMarket += bottleValue(b)
    if (b.paid != null && b.paid > 0 && b.quantity > 0) {
      invested += b.paid * b.quantity
      marketOfInvested += bottleValue(b)
      coveredBottles += b.quantity
    }
  })
  const gain = marketOfInvested - invested
  return {
    invested,
    marketOfInvested,
    gain,
    gainPct: invested > 0 ? (gain / invested) * 100 : null,
    totalMarket,
    coverage: totalBottles > 0 ? coveredBottles / totalBottles : 0,
  }
}

export interface Mover {
  id: string
  name: string
  vintage: string
  /** Percent change vs what was paid, e.g. 34.2. */
  pct: number
  /** Absolute gain across the holding. */
  abs: number
}

/** Biggest gainers and losers vs their purchase price. */
export function movers(bottles: Bottle[], n = 3): { up: Mover[]; down: Mover[] } {
  const rows: Mover[] = bottles
    .filter((b) => b.paid != null && b.paid > 0 && b.quantity > 0)
    .map((b) => {
      const now = unitValueNow(b)
      return {
        id: b.id,
        name: b.name,
        vintage: String(b.vintage),
        pct: ((now - b.paid!) / b.paid!) * 100,
        abs: (now - b.paid!) * b.quantity,
      }
    })
  rows.sort((a, b) => b.pct - a.pct)
  return {
    up: rows.filter((r) => r.pct > 0).slice(0, n),
    down: rows
      .filter((r) => r.pct < 0)
      .slice(-n)
      .reverse(),
  }
}

export interface Realized {
  count: number
  countYear: number
  /** Estimated worth of what was drunk, from each linked bottle's price. */
  value: number
  /** How many pours could be valued (had a linkable bottle). */
  valued: number
}

export function realized(drinks: Drink[], bottles: Bottle[], year: number): Realized {
  const byId = new Map(bottles.map((b) => [b.id, b]))
  let value = 0
  let valued = 0
  let countYear = 0
  drinks.forEach((d) => {
    if (d.date && parseInt(d.date.slice(0, 4), 10) === year) countYear += 1
    const b = d.bottleId ? byId.get(d.bottleId) : undefined
    if (b) {
      value += unitValueNow(b)
      valued += 1
    }
  })
  return { count: drinks.length, countYear, value, valued }
}

export interface Slice {
  label: string
  value: number
  pct: number
}

export type AllocationDim = 'region' | 'colour' | 'decade'

const COLOUR_LABELS: Record<string, string> = { red: 'Red', white: 'White', sparkling: 'Sparkling', rose: 'Rosé', fortified: 'Fortified' }

/** Value split across a dimension: top slices plus Other, with shares. */
export function allocation(bottles: Bottle[], dim: AllocationDim, maxSlices = 5): Slice[] {
  const map: Record<string, number> = {}
  bottles.forEach((b) => {
    const key =
      dim === 'region'
        ? b.area || 'Elsewhere'
        : dim === 'colour'
          ? COLOUR_LABELS[b.colour] || b.colour
          : typeof b.vintage === 'number'
            ? `${Math.floor(b.vintage / 10) * 10}s`
            : 'NV'
    map[key] = (map[key] || 0) + bottleValue(b)
  })
  const total = Object.values(map).reduce((a, v) => a + v, 0)
  if (total <= 0) return []
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
  const head = sorted.slice(0, maxSlices)
  const rest = sorted.slice(maxSlices).reduce((a, [, v]) => a + v, 0)
  const slices = head.map(([label, value]) => ({ label, value, pct: (value / total) * 100 }))
  if (rest > 0) slices.push({ label: 'Other', value: rest, pct: (rest / total) * 100 })
  return slices
}

export interface Rung {
  label: string
  value: number
}

/** Value scheduled by when it should be drunk, like a bond maturity ladder. */
export function windowLadder(bottles: Bottle[], nowYear: number): Rung[] {
  const rungs: { label: string; match: (b: Bottle) => boolean }[] = [
    { label: `Drink now`, match: (b) => typeof b.drinkTo === 'number' && b.drinkTo <= nowYear + 1 },
    { label: `${nowYear + 2}-${nowYear + 5}`, match: (b) => typeof b.drinkTo === 'number' && b.drinkTo >= nowYear + 2 && b.drinkTo <= nowYear + 5 },
    { label: `${nowYear + 6}-${nowYear + 12}`, match: (b) => typeof b.drinkTo === 'number' && b.drinkTo >= nowYear + 6 && b.drinkTo <= nowYear + 12 },
    { label: `${nowYear + 13} and beyond`, match: (b) => typeof b.drinkTo === 'number' && b.drinkTo >= nowYear + 13 },
    { label: 'No window set', match: (b) => typeof b.drinkTo !== 'number' },
  ]
  return rungs
    .map((r) => ({ label: r.label, value: bottles.filter(r.match).reduce((a, b) => a + bottleValue(b), 0) }))
    .filter((r) => r.value > 0)
}

export interface Concentration {
  line: string
  flagged: boolean
}

/** A quiet note when one wine or region dominates the portfolio's value. */
export function concentration(bottles: Bottle[]): Concentration | null {
  const total = bottles.reduce((a, b) => a + bottleValue(b), 0)
  if (total <= 0 || bottles.length < 2) return null
  let topWine: Bottle | null = null
  let topWineValue = 0
  const regions: Record<string, number> = {}
  bottles.forEach((b) => {
    const v = bottleValue(b)
    if (v > topWineValue) {
      topWineValue = v
      topWine = b
    }
    const r = b.area || 'Elsewhere'
    regions[r] = (regions[r] || 0) + v
  })
  const [topRegion, topRegionValue] = Object.entries(regions).sort((a, b) => b[1] - a[1])[0]
  const winePct = Math.round((topWineValue / total) * 100)
  const regionPct = Math.round((topRegionValue / total) * 100)
  if (topWine && winePct >= 35) {
    const w = topWine as Bottle
    return { line: `${w.name} ${w.vintage} alone is ${winePct}% of your portfolio's value.`, flagged: true }
  }
  if (regionPct >= 60) {
    return { line: `${topRegion} carries ${regionPct}% of your portfolio's value.`, flagged: true }
  }
  return { line: `Spread across ${Object.keys(regions).length} regions; the largest position is ${winePct}% of value.`, flagged: false }
}
