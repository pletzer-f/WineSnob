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

/** Country from the region text; '' when it cannot be told (never guessed).
 * Country is a derived field (no form edits it), so readers may prefer this
 * over a stored value to self-heal older rows. */
export function inferCountry(region: string): string {
  const r = region.toLowerCase()
  if (/italy|toscana|tuscany|piedmont|piemonte|puglia|salento|sicil|veneto|barolo|barbaresco|bolgheri|chianti|montalcino|langhe|\balba\b|abruzzo|campania|friuli|alto adige|trentino|umbria|marche|etna|\bigt\b|\bigp\b|\bdocg?\b/.test(r)) return 'Italy'
  if (/spain|rioja|ribera|priorat|jerez|rueda|bierzo|penedes/.test(r)) return 'Spain'
  if (/germany|mosel|rheingau|pfalz|nahe|rheinhessen|baden|franken/.test(r)) return 'Germany'
  if (/austria|wachau|kamptal|kremstal|burgenland|steiermark/.test(r)) return 'Austria'
  if (/portugal|douro|d[aã]o|alentejo|vinho verde|madeira/.test(r)) return 'Portugal'
  if (/california|napa|sonoma|oregon|washington|\busa\b/.test(r)) return 'USA'
  if (/australia|barossa|margaret river|mclaren|yarra/.test(r)) return 'Australia'
  if (/new zealand|marlborough|central otago/.test(r)) return 'New Zealand'
  if (/argentina|mendoza/.test(r)) return 'Argentina'
  if (/chile|maipo|colchagua/.test(r)) return 'Chile'
  if (/south africa|stellenbosch|swartland/.test(r)) return 'South Africa'
  if (/france|bordeaux|burgund|bourgogne|champagne|rh[ôo]ne|loire|alsace|provence|languedoc|beaujolais|jura|savoie|m[ée]doc|margaux|pauillac|est[èe]phe|julien|pessac|graves|pomerol|[ée]milion|sauternes|chablis|sancerre/.test(r)) return 'France'
  return ''
}
