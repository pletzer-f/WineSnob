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
 * over a stored value to self-heal older rows. France is tested first:
 * accented words like "Médoc" break \b word boundaries, so generic terms
 * (DOC, IGT) must never get the chance to misread a French appellation. */
export function inferCountry(region: string): string {
  const r = region.toLowerCase()
  if (/france|bordeaux|burgund|bourgogne|champagne|rh[ôo]ne|loire|alsace|provence|languedoc|beaujolais|jura|savoie|m[ée]doc|margaux|pauillac|est[èe]phe|julien|pessac|graves|pomerol|[ée]milion|sauternes|barsac|chablis|sancerre|vouvray|chinon|condrieu|hermitage|c[ôo]te-r[ôo]tie|ch[âa]teauneuf|gigondas|cornas|corton|montrachet|musigny|chambertin|roman[ée]e/.test(r)) return 'France'
  if (/italy|italia|toscana|tuscany|piedmont|piemonte|puglia|salento|manduria|sicil|veneto|valpolicella|amarone|conegliano|prosecco|soave|barolo|barbaresco|bolgheri|sassicaia|chianti|montalcino|montepulciano|langhe|\balba\b|abruzzo|campania|friuli|alto adige|s[üu]dtirol|trentino|umbria|marche|etna|primitivo|negroamaro|nebbiolo|sangiovese|brunello|\bigt\b|\bigp\b/.test(r)) return 'Italy'
  if (/spain|espa[ñn]a|rioja|ribera del|priorat|jerez|rueda|bierzo|pened[èe]s|rias baixas/.test(r)) return 'Spain'
  if (/austria|[öo]sterreich|wachau|kamptal|kremstal|burgenland|steiermark|gr[üu]ner/.test(r)) return 'Austria'
  if (/germany|deutschland|mosel|rheingau|pfalz|nahe|rheinhessen|baden|franken|w[üu]rttemberg/.test(r)) return 'Germany'
  if (/portugal|douro|d[aã]o|alentejo|vinho verde|madeira|bairrada/.test(r)) return 'Portugal'
  if (/california|napa|sonoma|oregon|willamette|washington|\busa\b|united states/.test(r)) return 'USA'
  if (/australia|barossa|margaret river|mclaren|yarra|hunter valley|coonawarra/.test(r)) return 'Australia'
  if (/new zealand|marlborough|central otago|hawke/.test(r)) return 'New Zealand'
  if (/argentina|mendoza|uco/.test(r)) return 'Argentina'
  if (/\bchile\b|maipo|colchagua|casablanca valley/.test(r)) return 'Chile'
  if (/south africa|stellenbosch|swartland|franschhoek/.test(r)) return 'South Africa'
  if (/switzerland|schweiz|valais|vaud/.test(r)) return 'Switzerland'
  return ''
}

const COUNTRY_WORDS = /^(france|italy|italia|spain|espa[ñn]a|germany|deutschland|austria|[öo]sterreich|portugal|usa|united states|australia|new zealand|argentina|chile|south africa|switzerland|schweiz)$/i

const COARSE_AREAS: [RegExp, string][] = [
  [/margaux|pauillac|est[èe]phe|julien|pessac|graves|pomerol|[ée]milion|sauternes|barsac|m[ée]doc|listrac|moulis|fronsac|bordeaux/, 'Bordeaux'],
  [/chablis|beaune|gevrey|chambolle|vosne|meursault|puligny|chassagne|nuits|pommard|volnay|corton|montrachet|musigny|chambertin|roman[ée]e|bourgogne|burgundy/, 'Burgundy'],
  [/champagne/, 'Champagne'],
  [/hermitage|c[ôo]te-r[ôo]tie|ch[âa]teauneuf|condrieu|gigondas|cornas|saint-joseph|vacqueyras|rh[ôo]ne/, 'Rhône'],
  [/sancerre|vouvray|chinon|pouilly|anjou|saumur|muscadet|loire/, 'Loire'],
  [/provence/, 'Provence'],
  [/barolo|barbaresco|langhe|\balba\b|barbera|nebbiolo|roero|piemonte|piedmont/, 'Piedmont'],
  [/toscana|bolgheri|sassicaia|chianti|montalcino|brunello|maremma|tuscany/, 'Tuscany'],
  [/valpolicella|amarone|conegliano|prosecco|soave|veneto/, 'Veneto'],
  [/salento|manduria|primitivo|negroamaro|puglia/, 'Puglia'],
  [/etna|sicil/, 'Sicily'],
  [/wachau|kamptal|kremstal/, 'Wachau'],
  [/mosel/, 'Mosel'],
  [/rioja/, 'Rioja'],
  [/napa|sonoma|california/, 'California'],
  [/douro/, 'Douro'],
]

/** Coarse region for grouping and filters: "Saint-Estèphe, Bordeaux" and
 * plain "Saint-Estèphe" both come home to "Bordeaux"; a trailing country
 * segment ("Champagne, France") never becomes the area. Derived like
 * country, so readers may self-heal older rows with it. */
export function inferArea(region: string): string {
  const r = region.toLowerCase()
  for (const [re, area] of COARSE_AREAS) if (re.test(r)) return area
  const parts = region.split(',').map((p) => p.trim()).filter(Boolean)
  const meaningful = parts.filter((p) => !COUNTRY_WORDS.test(p))
  return meaningful[meaningful.length - 1] || parts[parts.length - 1] || region.trim() || '-'
}
