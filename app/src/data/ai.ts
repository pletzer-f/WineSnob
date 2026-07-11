import { hasSupabase, supabase } from '@/lib/supabase'
import type { RawRead } from '@/store/store'

/** Read wine labels from photos. Calls the `read-label` Edge Function when a
 * Supabase project is configured; otherwise returns demo reads so the flow is
 * fully explorable offline. */
export async function readLabels(files: File[], mode: 'label' | 'case' | 'voice'): Promise<RawRead[]> {
  if (hasSupabase && files.length) {
    // Downscale on the device before upload: a 4 MB camera shot becomes a
    // ~250 KB JPEG, so a whole batch uploads in one quick request.
    const images = await Promise.all(files.map((f) => downscaleImage(f, 1568).catch(() => fileToBase64(f))))
    const { data, error } = await supabase.functions.invoke('read-label', {
      body: { images, mode },
    })
    if (error) throw error
    const reads = (data?.reads ?? []) as RawRead[]
    if (!reads.length) throw new Error('No wines were read from that photo.')
    return reads
  }
  return mode === 'case' ? caseBatch() : labelBatch()
}

/** Parse an uploaded cellar list (CSV / spreadsheet / PDF) into reads. */
export async function parseImport(file: File): Promise<RawRead[]> {
  if (hasSupabase) {
    const content = await fileToBase64(file)
    const { data, error } = await supabase.functions.invoke('parse-import', {
      body: { file: content, filename: file.name },
    })
    if (error) throw error
    return (data?.reads ?? []) as RawRead[]
  }
  return caseBatch()
}

// ---- cellar valuation ----

export interface ValuationRow {
  id: string
  unit: number
  low?: number
  high?: number
  source: string
  asOf: string
  read?: string
}

export interface ValuationResult {
  configured: boolean
  provider: string
  asOf?: string
  matched?: number
  total?: number
  results: ValuationRow[]
}

export interface ValuationInput {
  id: string
  name: string
  producer: string
  vintage: string
  region: string
  format: string
}

/** Fetch live market prices for a set of bottles. Returns configured:false
 * when no price source is connected (the app then shows recorded values). */
export async function valueCellar(bottles: ValuationInput[], currency: string): Promise<ValuationResult> {
  if (!hasSupabase) return { configured: false, provider: 'Wine-Searcher', results: [] }
  // Chunk large cellars so each function call stays fast and within limits
  // (the AI market search engine prices up to 12 wines per call).
  const chunks: ValuationInput[][] = []
  for (let i = 0; i < bottles.length; i += 12) chunks.push(bottles.slice(i, i + 12))
  const out: ValuationResult = { configured: true, provider: 'Wine-Searcher', results: [] }
  for (const chunk of chunks) {
    const { data, error } = await supabase.functions.invoke('value-cellar', { body: { bottles: chunk, currency } })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    if (!data?.configured) return { configured: false, provider: data?.provider || 'Wine-Searcher', results: [] }
    out.provider = data.provider || out.provider
    out.asOf = data.asOf
    out.results.push(...((data.results as ValuationRow[]) || []))
  }
  out.matched = out.results.length
  out.total = bottles.length
  return out
}

// ---- the sommelier ----

export interface SomPick {
  bottleId: string
  name: string
  vintage: string
  role: 'top' | 'alternate' | 'buy'
  why: string
  serve: string
  sayThis: string
}

export interface SomResult {
  reply: string
  quickReplies: string[]
  picks: SomPick[]
  raw: string
}

export interface SomTurnPayload {
  role: 'user' | 'assistant'
  text: string
  image?: string | null
}

/** Ask the sommelier. Multi-turn, grounded in the owner's cellar; optional
 * photo of a dish, menu or shelf. Demo mode answers from the local cellar. */
export async function askSommelier(turns: SomTurnPayload[], context: Record<string, unknown>): Promise<SomResult> {
  if (hasSupabase) {
    const { data, error } = await supabase.functions.invoke('sommelier', { body: { turns, context } })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return {
      reply: data?.reply || '',
      quickReplies: (data?.quickReplies as string[]) || [],
      picks: (data?.picks as SomPick[]) || [],
      raw: data?.raw || '',
    }
  }
  return demoSommelier(turns, context)
}

/** Downscale a photo before sending it to the sommelier (keeps payloads light). */
export function downscaleImage(file: File, maxEdge = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas unavailable'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that photo.'))
    }
    img.src = url
  })
}

async function demoSommelier(turns: SomTurnPayload[], context: Record<string, unknown>): Promise<SomResult> {
  await new Promise((r) => setTimeout(r, 900))
  const cellar = (context.cellar as Array<Record<string, unknown>>) || []
  const userTurns = turns.filter((t) => t.role === 'user')
  if (userTurns.length === 1 && !userTurns[0].image) {
    return {
      reply: 'Gladly. Is this a relaxed evening or a proper occasion, and are we leaning red or white?',
      quickReplies: ['Relaxed, red', 'Proper occasion', 'Something white', 'Surprise me'],
      picks: [],
      raw: 'demo-clarify',
    }
  }
  const ready = cellar.filter((b) => b.status === 'ready')
  const byRating = ready.slice().sort((a, b) => ((b.rating as number) || 0) - ((a.rating as number) || 0))
  const top = byRating[0]
  const alt = byRating.find((b) => b.id !== top?.id && b.colour === top?.colour) || byRating[1]
  const picks: SomPick[] = []
  if (top) {
    picks.push({
      bottleId: String(top.id),
      name: String(top.name),
      vintage: String(top.vintage),
      role: 'top',
      why: 'It is squarely in its drinking window, you hold enough of it for the table, and it carries the evening without raiding the trophies.',
      serve: '16-18C, decant 45 minutes, large-bowled glass',
      sayThis: `The ${top.vintage} is drinking exactly where it should be, so we are opening it tonight rather than in five years.`,
    })
  }
  if (alt) {
    picks.push({
      bottleId: String(alt.id),
      name: String(alt.name),
      vintage: String(alt.vintage),
      role: 'alternate',
      why: 'A touch plusher if the mood turns richer; equally ready, and there is a spare bottle should the first vanish quickly.',
      serve: '16-18C, 30 minutes of air, same glasses',
      sayThis: 'I wanted something with a little more flesh on the bone in reserve, in case the night runs long.',
    })
  }
  return {
    reply: picks.length
      ? 'Then here is my verdict from your own rack. Both are ready tonight; the first is the one I would open.'
      : 'Your cellar is empty just now, so add a few bottles and I will have something to pour.',
    quickReplies: [],
    picks,
    raw: 'demo-picks',
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ---- demo reads (mirror the prototype's simulated OCR) ----
function labelBatch(): RawRead[] {
  return [{ name: 'Château Palmer', producer: 'Margaux', vintage: 2016, region: 'Margaux, Bordeaux', colour: 'red', confidence: 'high', unit: 320 }]
}

function caseBatch(): RawRead[] {
  return [
    { name: 'Châteauneuf-du-Pape', producer: 'Château de Beaucastel', vintage: 2019, region: 'Southern Rhône', colour: 'red', confidence: 'high', unit: 120 },
    { name: 'Gevrey-Chambertin 1er Cru', producer: 'Domaine Fourrier', vintage: 2020, region: 'Burgundy', colour: 'red', confidence: 'medium', unit: 180 },
    { name: 'Champagne: label unclear', producer: '', vintage: '?', region: 'Champagne', colour: 'sparkling', confidence: 'low', unit: 70 },
    { name: 'Condrieu La Doriane', producer: 'E. Guigal', vintage: 2021, region: 'Northern Rhône', colour: 'white', confidence: 'high', unit: 95 },
    { name: 'Sassicaia', producer: 'Tenuta San Guido', vintage: 2019, region: 'Bolgheri, Tuscany', colour: 'red', confidence: 'high', unit: 240 },
  ]
}
