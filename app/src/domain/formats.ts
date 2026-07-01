import type { FormatKey } from './types'

/**
 * Bottle formats. Each carries the volume `equiv` (in standard 750 ml
 * bottles), a collector `premium` on the per-bottle value, and an `age`
 * factor: large formats age more slowly (window stretches off the vintage),
 * small formats age faster.
 */
export interface FormatDef {
  key: FormatKey
  label: string
  litres: number
  equiv: number
  premium: number
  age: number
}

export const FORMAT_DEFS: FormatDef[] = [
  { key: 'half', label: 'Half bottle', litres: 0.375, equiv: 0.5, premium: 0.95, age: 0.7 },
  { key: 'standard', label: 'Standard', litres: 0.75, equiv: 1, premium: 1, age: 1 },
  { key: 'magnum', label: 'Magnum', litres: 1.5, equiv: 2, premium: 1.12, age: 1.3 },
  { key: 'jeroboam', label: 'Jéroboam', litres: 3, equiv: 4, premium: 1.25, age: 1.6 },
  { key: 'rehoboam', label: 'Rehoboam', litres: 4.5, equiv: 6, premium: 1.35, age: 1.8 },
  { key: 'methuselah', label: 'Methuselah', litres: 6, equiv: 8, premium: 1.5, age: 2 },
  { key: 'salmanazar', label: 'Salmanazar', litres: 9, equiv: 12, premium: 1.6, age: 2.2 },
  { key: 'balthazar', label: 'Balthazar', litres: 12, equiv: 16, premium: 1.7, age: 2.4 },
  { key: 'nebuchadnezzar', label: 'Nebuchadnezzar', litres: 15, equiv: 20, premium: 1.9, age: 2.6 },
]

export function fmtDef(key: FormatKey | string | undefined): FormatDef {
  return FORMAT_DEFS.find((f) => f.key === key) || FORMAT_DEFS[1]
}

export function fmtLitres(l: number): string {
  return l < 1 ? `${(l * 1000).toFixed(0)} ml` : `${Number.isInteger(l) ? l : l.toFixed(2)} L`
}
