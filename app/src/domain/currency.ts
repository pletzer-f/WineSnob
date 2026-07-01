import type { Currency } from './types'

const MAP: Record<Currency, { sym: string; loc: string }> = {
  EUR: { sym: '€', loc: 'en-GB' },
  USD: { sym: '$', loc: 'en-US' },
  GBP: { sym: '£', loc: 'en-GB' },
}

/** Format a number as money in the given currency (whole units, localized). */
export function formatMoney(n: number, currency: Currency = 'EUR'): string {
  const c = MAP[currency] || MAP.EUR
  return c.sym + Math.round(n).toLocaleString(c.loc)
}

export function currencySymbol(currency: Currency = 'EUR'): string {
  return (MAP[currency] || MAP.EUR).sym
}
