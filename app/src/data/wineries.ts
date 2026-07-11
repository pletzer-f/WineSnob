// WineSnob — estate dossiers. Each producer is researched ONCE, ever, by the
// winery-profile edge function (Claude + live web search) and cached in the
// global `wineries` table for every user. The client checks its own memory,
// then the table, and only then asks for fresh research.

import { hasSupabase, supabase } from '@/lib/supabase'

export interface Winery {
  id: string
  name: string
  summary?: string
  history?: string
  region?: string
  country?: string
  founded?: string
  appellation?: string
  classification?: string
  hectares?: string
  production?: string
  secondWine?: string
  style?: string
  knownFor?: string
  imageUrl?: string
  imageAttribution?: string
  imageLicense?: string
  imageSourceUrl?: string
}

export interface WineryHints {
  wine?: string
  region?: string
  country?: string
}

/** Stable slug for a producer: "Château Palmer" -> "chateau-palmer". */
export function winerySlug(producer: string): string {
  return producer
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const cache = new Map<string, Winery | null>()
const inflight = new Map<string, Promise<Winery | null>>()

const clean = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s && s.toLowerCase() !== 'unknown' && s.toLowerCase() !== 'n/a' ? s : undefined
}

function fromRow(r: Record<string, unknown>): Winery {
  return {
    id: String(r.id),
    name: clean(r.name) || String(r.id),
    summary: clean(r.summary),
    history: clean(r.history),
    region: clean(r.region),
    country: clean(r.country),
    founded: clean(r.founded),
    appellation: clean(r.appellation),
    classification: clean(r.classification),
    hectares: clean(r.hectares),
    production: clean(r.production),
    secondWine: clean(r.second_wine),
    style: clean(r.style),
    knownFor: clean(r.known_for),
    imageUrl: clean(r.image_url),
    imageAttribution: clean(r.image_attribution),
    imageLicense: clean(r.image_license),
    imageSourceUrl: clean(r.image_source_url),
  }
}

/** Fetch (or research) the dossier for a producer. Returns null when the
 * estate cannot be researched (demo mode, unknown producer, failure). */
export async function getWineryProfile(producer: string, hints: WineryHints = {}): Promise<Winery | null> {
  const id = winerySlug(producer)
  if (!id || id === 'unknown-producer') return null
  if (cache.has(id)) return cache.get(id) ?? null
  const running = inflight.get(id)
  if (running) return running
  const p = load(id, producer, hints)
    .catch(() => null)
    .then((w) => {
      cache.set(id, w)
      inflight.delete(id)
      return w
    })
  inflight.set(id, p)
  return p
}

async function load(id: string, producer: string, hints: WineryHints): Promise<Winery | null> {
  if (!hasSupabase) return DEMO_WINERIES[id] ?? null
  // 1) the shared cache table
  const { data } = await supabase.from('wineries').select('*').eq('id', id).maybeSingle()
  if (data) return fromRow(data)
  // 2) fresh research, written server-side for everyone
  const res = await supabase.functions.invoke('winery-profile', {
    body: { producer, wine: hints.wine, region: hints.region, country: hints.country },
  })
  if (res.error) throw res.error
  if (res.data?.error) throw new Error(res.data.error)
  return res.data?.winery ? fromRow(res.data.winery) : null
}

// Demo mode ships two finished dossiers so the section is explorable offline.
const DEMO_WINERIES: Record<string, Winery> = {
  'giacomo-conterno': {
    id: 'giacomo-conterno',
    name: 'Giacomo Conterno',
    summary:
      'The reference point for traditional Barolo: a small Monforte d’Alba estate whose wines are built for decades, not seasons.',
    history:
      'Founded in 1908, the house made its name with Monfortino, a riserva first bottled around the First World War and still released only in the finest years. In 1974 the family bought the Francia vineyard in Serralunga, and since 2008 Roberto Conterno has led the estate.',
    region: 'Piedmont',
    country: 'Italy',
    founded: '1908',
    appellation: 'Barolo DOCG',
    hectares: '14 ha (Francia, Cerretta, Arione)',
    secondWine: 'Barolo Francia',
    style: 'Long macerations and large old botti; austere in youth, monumental with age.',
    knownFor: 'Barolo Riserva Monfortino, among Italy’s most collected wines.',
  },
  'tenuta-san-guido': {
    id: 'tenuta-san-guido',
    name: 'Tenuta San Guido',
    summary:
      'The birthplace of Sassicaia and of the Super Tuscan idea: Cabernet on the Bolgheri coast, farmed by the Incisa della Rocchetta family.',
    history:
      'Marchese Mario Incisa della Rocchetta planted Cabernet at San Guido in the 1940s for the family table; the 1968 vintage became the first commercial Sassicaia and the 1985 made it world famous. In 2013 Bolgheri Sassicaia became Italy’s only single-estate DOC.',
    region: 'Tuscany',
    country: 'Italy',
    founded: '1948',
    appellation: 'Bolgheri Sassicaia DOC',
    hectares: '90 ha under vine',
    secondWine: 'Guidalberto',
    style: 'Cabernet Sauvignon and Cabernet Franc; Medoc-inspired, maritime, ages gracefully for decades.',
    knownFor: 'Sassicaia, the original Super Tuscan.',
  },
}
