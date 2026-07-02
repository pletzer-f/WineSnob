import { fmtDef } from './formats'
import type { Bottle } from './types'

/** The per-standard-bottle price used for valuation: the live market price
 * when a price source has valued this bottle, otherwise the recorded value. */
export function unitPrice(b: Bottle): number {
  return b.marketUnit != null && b.marketUnit > 0 ? b.marketUnit : b.unit
}

/** True when this bottle carries a market price from a connected price source. */
export function hasMarketValue(b: Bottle): boolean {
  return b.marketUnit != null && b.marketUnit > 0
}

/**
 * Value of a holding, folding in the format's volume and collector premium.
 * value = quantity × price(per standard bottle) × equiv × premium
 */
export function bottleValue(b: Bottle): number {
  const d = fmtDef(b.format || 'standard')
  return b.quantity * unitPrice(b) * d.equiv * d.premium
}

/** Bottle-equivalents held (a magnum counts as two standards). */
export function bottleEquivalents(b: Bottle): number {
  return b.quantity * fmtDef(b.format || 'standard').equiv
}

/**
 * Large formats age more slowly — stretch the drink window off the vintage.
 * Small formats age faster. Returns the format-adjusted window.
 */
export function formatWindow(b: Bottle): { from?: number; to?: number } {
  const d = fmtDef(b.format || 'standard')
  const vy = typeof b.vintage === 'number' ? b.vintage : b.drinkFrom ? b.drinkFrom - 2 : 2020
  if (d.age === 1 || typeof b.drinkFrom !== 'number' || typeof b.drinkTo !== 'number') {
    return { from: b.drinkFrom, to: b.drinkTo }
  }
  return {
    from: vy + Math.round((b.drinkFrom - vy) * d.age),
    to: vy + Math.round((b.drinkTo - vy) * d.age),
  }
}

/** Per-bottle current value, format-adjusted. */
export function unitValueNow(b: Bottle): number {
  return bottleValue(b) / Math.max(1, b.quantity)
}
