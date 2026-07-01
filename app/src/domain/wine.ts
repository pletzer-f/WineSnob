import type { Bottle } from './types'

export interface Verdict {
  label: string
  tone: 'neutral' | 'cellar' | 'accent' | 'ready'
}

/** Normalise a wine name for duplicate matching. */
export function normName(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(chateau|domaine|the)/, '')
}

/** Find an existing holding matching a raw read (name + vintage). */
export function detectDup(
  row: { name: string; vintage: unknown },
  cellar: Bottle[],
): Bottle | null {
  const rn = normName(row.name)
  if (!rn) return null
  return cellar.find((b) => normName(b.name) === rn && String(b.vintage) === String(row.vintage)) || null
}

/** Other holdings of the same wine + vintage, in any format. */
export function siblingsOf(b: Bottle | null, cellar: Bottle[]): Bottle[] {
  if (!b) return []
  const norm = (s: unknown) => (s || '').toString().trim().toLowerCase()
  return cellar.filter(
    (o) =>
      o.id !== b.id &&
      norm(o.name) === norm(b.name) &&
      norm(o.producer) === norm(b.producer) &&
      String(o.vintage) === String(b.vintage),
  )
}

/** How a pour drank versus its window, from the drink date. */
export function drinkVerdict(rec: {
  date?: string
  drinkFrom?: number
  drinkTo?: number
}): Verdict {
  const y = rec.date ? parseInt(rec.date.slice(0, 4), 10) : null
  if (y == null || typeof rec.drinkFrom !== 'number' || typeof rec.drinkTo !== 'number') {
    return { label: '', tone: 'neutral' }
  }
  if (y < rec.drinkFrom) return { label: 'Opened early', tone: 'cellar' }
  if (y > rec.drinkTo) return { label: 'Past its peak', tone: 'accent' }
  return { label: 'In its window', tone: 'ready' }
}
