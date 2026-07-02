// WineSnob — real cellar valuation. Live market prices from a wine price
// provider (Wine-Searcher by default), matched to each bottle and explained by
// Claude Opus 4.8. Self-contained so it deploys as a single file.
//
// Secrets to set once the provider key arrives (Supabase → Edge Functions → secrets):
//   WINE_PRICE_API_KEY   REQUIRED — the provider API key. With no key this
//                        function returns { configured:false } and the app
//                        keeps showing each bottle's recorded value.
//   WINE_PRICE_API_URL   optional — the provider's base URL. Defaults to the
//                        Wine-Searcher API base; override if your plan differs.
//   WINE_PRICE_PROVIDER  optional — display name shown in the app. Default
//                        "Wine-Searcher".
//   ANTHROPIC_API_KEY    already set — used for wine matching + the market read.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } })
}

const PROVIDER = Deno.env.get('WINE_PRICE_PROVIDER') || 'Wine-Searcher'
// Wine-Searcher trade API base. The exact base is issued with your key; if it
// differs, set WINE_PRICE_API_URL and no code change is needed.
const API_URL = Deno.env.get('WINE_PRICE_API_URL') || 'https://api.wine-searcher.com/wine-searcher-api'

function num(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.]/g, '')) : Number(v)
  return Number.isFinite(n) ? n : null
}

async function claudeJSON(system: string, userText: string, schema: Record<string, unknown>, maxTokens = 2048): Promise<any> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured.')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userText }],
      output_config: { format: { type: 'json_schema', schema } },
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  if (data.stop_reason === 'refusal') throw new Error('The request was declined.')
  const text = (data.content || []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
  return JSON.parse(text)
}

const MATCH_SYSTEM = `You normalize private-cellar wine entries into clean queries for a wine price database.
For each bottle return: its exact "id" (unchanged), a "winename" (the producer and wine/cuvée as a price
database expects it, with no bottle-format words like "magnum" and no vintage in the string), and "vintage"
as a 4-digit year or "" for non-vintage. Stay faithful to the input; never invent a wine that was not given.`

const MATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, winename: { type: 'string' }, vintage: { type: 'string' } },
        required: ['id', 'winename', 'vintage'],
      },
    },
  },
  required: ['items'],
}

const READ_SYSTEM = `You are a fine-wine market analyst writing for the wine's owner.
For each wine, given its current market price, write ONE short sentence (max 20 words) on how it is trading
and whether to hold, drink, or consider selling. Calm and factual, British restraint, no hype, no em dashes.`

const READ_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reads: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, read: { type: 'string' } },
        required: ['id', 'read'],
      },
    },
  },
  required: ['reads'],
}

interface InBottle { id: string; name?: string; producer?: string; vintage?: string | number; region?: string; format?: string }

/**
 * Provider adapter. Returns the market price per standard bottle, plus range.
 * ==== Wine-Searcher mapping — the one place to adjust if your plan differs. ====
 */
async function fetchPrice(winename: string, vintage: string, currency: string, apiKey: string): Promise<{ avg: number | null; min: number | null; max: number | null } | null> {
  const url = new URL(API_URL)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('winename', winename)
  if (/^\d{4}$/.test(vintage)) url.searchParams.set('vintage', vintage)
  url.searchParams.set('currencycode', currency)
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString(), { headers: { accept: 'application/json' } })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  if (!data) return null

  // Wine-Searcher returns hyphenated fields; tolerate common variants + nesting.
  const body = (data['wine-searcher-api'] || data.body || data.wine || data) as Record<string, unknown>
  const pick = (keys: string[]) => {
    for (const k of keys) if (body && body[k] != null) return body[k]
    return null
  }
  const avg = num(pick(['price-average', 'price_average', 'priceAverage', 'average-price', 'average']))
  const min = num(pick(['price-min', 'price_min', 'priceMin', 'min-price', 'min']))
  const max = num(pick(['price-max', 'price_max', 'priceMax', 'max-price', 'max']))
  if (avg == null && min == null && max == null) return null
  const derivedAvg = avg ?? (min != null && max != null ? Math.round((min + max) / 2) : min ?? max)
  return { avg: derivedAvg, min, max }
  // ================================================================================
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { bottles = [], currency = 'EUR', withRead = true } = await req.json()
    const apiKey = Deno.env.get('WINE_PRICE_API_KEY')

    // Dormant until a price key is set. The app reads this and shows recorded values.
    if (!apiKey) return json({ configured: false, provider: PROVIDER, results: [] })
    if (!Array.isArray(bottles) || bottles.length === 0) return json({ configured: true, provider: PROVIDER, results: [] })

    // Bound cost and time per refresh; the client chunks larger cellars.
    const batch: InBottle[] = bottles.slice(0, 80)

    // 1) Normalize each entry into a clean provider query (best-effort).
    let queries = batch.map((b) => ({ id: b.id, winename: [b.producer, b.name].filter(Boolean).join(' ').trim(), vintage: String(b.vintage ?? '') }))
    try {
      const norm = await claudeJSON(MATCH_SYSTEM, JSON.stringify(batch), MATCH_SCHEMA)
      if (norm?.items?.length) {
        const map = new Map<string, { winename: string; vintage: string }>(norm.items.map((i: any) => [i.id, { winename: i.winename, vintage: i.vintage }]))
        queries = batch.map((b) => {
          const m = map.get(b.id)
          return m && m.winename ? { id: b.id, winename: m.winename, vintage: m.vintage || '' } : { id: b.id, winename: [b.producer, b.name].filter(Boolean).join(' ').trim(), vintage: String(b.vintage ?? '') }
        })
      }
    } catch (_) {
      // fall back to naive queries
    }

    // 2) Look up market prices (sequential to respect provider rate limits).
    const asOf = new Date().toISOString().slice(0, 10)
    const results: any[] = []
    for (const q of queries) {
      if (!q.winename) continue
      const p = await fetchPrice(q.winename, q.vintage, currency, apiKey).catch(() => null)
      if (p && p.avg != null) {
        results.push({ id: q.id, unit: Math.round(p.avg), low: p.min ?? undefined, high: p.max ?? undefined, matched: q.winename, currency, source: PROVIDER, asOf })
      }
    }

    // 3) One short market read per priced bottle (optional).
    if (withRead && results.length) {
      try {
        const ctx = results.map((r) => {
          const b = batch.find((x) => x.id === r.id)
          return { id: r.id, name: b?.name, producer: b?.producer, vintage: b?.vintage, region: b?.region, price: r.unit, low: r.low, high: r.high, currency }
        })
        const reads = await claudeJSON(READ_SYSTEM, JSON.stringify(ctx), READ_SCHEMA)
        const rmap = new Map<string, string>((reads?.reads || []).map((x: any) => [x.id, x.read]))
        results.forEach((r) => (r.read = rmap.get(r.id) || undefined))
      } catch (_) {
        // a missing read is non-fatal
      }
    }

    return json({ configured: true, provider: PROVIDER, asOf, currency, matched: results.length, total: batch.length, results })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
