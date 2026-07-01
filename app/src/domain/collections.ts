import type { Bottle } from './types'

/** Auto-filled "smart" collections, matched by rule against the cellar. */
export interface SmartCollectionDef {
  key: string
  title: string
  desc: string
  match: (b: Bottle) => boolean
}

export const SMART_COLLECTIONS: SmartCollectionDef[] = [
  { key: 'soon', title: 'Drink this year', desc: 'In their window and not getting any better.', match: (b) => b.status === 'ready' },
  { key: 'longhaul', title: 'The long haul', desc: 'Still maturing, hands off for now.', match: (b) => b.status === 'cellaring' },
  { key: 'bordeaux', title: 'Bordeaux', desc: 'The classed growths and their neighbours.', match: (b) => b.area === 'Bordeaux' },
  { key: 'burgundy', title: 'Burgundy', desc: 'Côte d’Or and Chablis, red and white.', match: (b) => b.area === 'Burgundy' },
  { key: 'whites', title: 'Whites & bubbles', desc: 'For the aperitif hour.', match: (b) => b.colour === 'white' || b.colour === 'sparkling' },
  { key: 'italy', title: 'Italy', desc: 'Piedmont, Tuscany and beyond.', match: (b) => b.country === 'Italy' },
  { key: 'icons', title: 'The 97+ club', desc: 'Where the critics and I agree.', match: (b) => b.score >= 97 },
]
