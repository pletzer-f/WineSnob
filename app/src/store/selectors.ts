import type { Bottle } from '@/domain/types'
import type { StoreState } from './store'

/** Bottles scoped to the active cellar (or all cellars). */
export function scopedBottles(s: Pick<StoreState, 'bottles' | 'activeCellar'>): Bottle[] {
  const active = s.activeCellar || 'main'
  return active === 'all' ? s.bottles : s.bottles.filter((b) => (b.cellarId || 'main') === active)
}

export function activeCellarName(s: Pick<StoreState, 'cellars' | 'activeCellar'>): string {
  const a = s.activeCellar || 'main'
  if (a === 'all') return 'All cellars'
  const c = s.cellars.find((x) => x.id === a)
  return c ? c.name : 'All cellars'
}

export function firstCellarId(s: Pick<StoreState, 'cellars'>): string {
  return s.cellars.length ? s.cellars[0].id : 'main'
}
