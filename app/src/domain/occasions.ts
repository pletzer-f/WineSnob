import type { Bottle } from './types'

/** Occasion-based recommender: pull a few bottles from the user's own cellar. */
export interface OccasionDef {
  key: string
  label: string
  blurb: string
  match: (b: Bottle) => boolean
  rank: (b: Bottle) => number
  reason: (b: Bottle, money: (n: number) => string) => string
}

export const OCCASIONS: OccasionDef[] = [
  {
    key: 'dinner',
    label: 'Dinner party',
    blurb: 'A crowd-pleasing red that’s drinking now.',
    match: (b) => b.colour === 'red' && b.status === 'ready',
    rank: (b) => b.score,
    reason: (b) => `A generous, ready ${b.area} red, ${b.score} points, and it won’t divide the table.`,
  },
  {
    key: 'romantic',
    label: 'Romantic dinner',
    blurb: 'Something quiet, elegant and ready.',
    match: (b) => b.status === 'ready' && b.score >= 95,
    rank: (b) => b.score,
    reason: (b) => `Poised and complex, ${b.score} points, in its window now. The kind of bottle you linger over.`,
  },
  {
    key: 'celebration',
    label: 'Celebration',
    blurb: 'Bubbles, obviously.',
    match: (b) => b.colour === 'sparkling',
    rank: (b) => (b.status === 'ready' ? 1 : 0) * 1000 + b.score,
    reason: (b) => `${b.status === 'ready' ? 'Ready to pour' : 'Worth opening early'}: ${b.score} points of celebration.`,
  },
  {
    key: 'gift',
    label: 'A gift',
    blurb: 'Impressive on sight, safe to give.',
    match: (b) => b.quantity >= 2 && b.score >= 96,
    rank: (b) => b.unit,
    reason: (b, money) => `Recognisable and serious, ${money(b.unit)} a bottle, ${b.score} points. You can spare one.`,
  },
  {
    key: 'weeknight',
    label: 'A weeknight',
    blurb: 'Honest, ready, nothing precious.',
    match: (b) => b.status === 'ready' && b.unit <= 200,
    rank: (b) => -b.unit,
    reason: (b, money) => `Easy and ready, ${money(b.unit)} a bottle. No occasion required.`,
  },
  {
    key: 'collector',
    label: 'Impress a collector',
    blurb: 'Pull out the big guns.',
    match: (b) => b.score >= 98,
    rank: (b) => b.score * 1000 + b.unit,
    reason: (b) => `${b.score} points and rarely poured, this is the one that starts conversations.`,
  },
  {
    key: 'patient',
    label: 'Lay one down',
    blurb: 'Buy time, not a corkscrew.',
    match: (b) => b.status === 'cellaring',
    rank: (b) => b.drinkTo || 0,
    reason: (b) => `Decades ahead of its peak, ideal to cellar until ${b.drinkTo}.`,
  },
]

export function occasionLabel(k: string): string {
  return (
    (
      {
        dinner: 'Dinner',
        celebration: 'Celebration',
        everyday: 'Everyday',
        'gift-given': 'Gift given',
        tasting: 'Tasting',
        restaurant: 'Restaurant',
      } as Record<string, string>
    )[k] || 'Dinner'
  )
}
