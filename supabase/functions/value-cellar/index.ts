// WineSnob — real cellar valuation, two engines behind one endpoint.
//
// Engine A (premium feed): when WINE_PRICE_API_KEY is set, prices come from a
//   dedicated wine price provider (Wine-Searcher adapter by default) with
//   Claude normalizing queries and writing the market read.
// Engine B (default): with no provider key, Claude Opus 4.8 prices each wine
//   from LIVE web listings via the Anthropic web search tool ($10 per 1,000
//   searches on the existing ANTHROPIC_API_KEY). Grounded in current results,
//   never guessed from model memory; wines without credible listings are
//   omitted rather than invented.
//
// Optional secrets (Supabase → Edge Functions → secrets):
//   WINE_PRICE_API_KEY   activates Engine A (takes precedence).
//   WINE_PRICE_API_URL   Engine A base URL override.
//   WINE_PRICE_PROVIDER  Engine A display name. Default "Wine-Searcher".
//   ANTHROPIC_API_KEY    required for everything (already set).

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

// ---- engine B: AI market search (default when no provider key is set) ----
// Claude searches live merchant and auction listings at valuation time and
// prices each wine from what it actually finds, with a low/high range. This is
// grounded in current web results, not model memory. Cost: ~1-2 web searches
// per wine at $10 per 1,000 searches, plus tokens.

const SEARCH_PROVIDER = 'AI market search'

const SEARCH_SYSTEM = `You are a fine-wine pricing analyst. For EACH wine in the list, use web search to find
current retail listings or recent auction results, then determine the typical market price TODAY for one
standard 750 ml bottle, in the requested currency (convert at current rates when a listing is in another
currency). Prefer reputable wine merchants and marketplaces; when the currency is EUR prefer European
listings. Use about one search per wine; only search again if the first result is inconclusive.

Rules:
- Price per standard 750 ml bottle, even when the owner holds another format.
- "low" and "high" reflect the spread of real listings you saw; "unit" is the typical mid.
- "read" is ONE short sentence (max 20 words) on how it is trading and whether to hold, drink, or sell,
  reflecting your confidence. Calm, factual, no hype, no em dashes.
- If you cannot find a credible current price for a wine, OMIT it entirely. Never guess from memory.
- Reply with ONLY a JSON object, no prose before or after, exactly:
  {"results":[{"id":"<exact id from input>","unit":<number>,"low":<number>,"high":<number>,"read":"<sentence>"}]}`

function parseLooseJSON(text: string): any {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('No JSON object in model reply.')
  return JSON.parse(text.slice(start, end + 1))
}

async function aiMarketSearch(batch: InBottle[], currency: string): Promise<any[]> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured.')
  const wines = batch.map((b) => ({ id: b.id, wine: [b.producer, b.name].filter(Boolean).join(' '), vintage: String(b.vintage ?? ''), region: b.region || '' }))
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: SEARCH_SYSTEM,
      messages: [{ role: 'user', content: `Currency: ${currency}\nWines:\n${JSON.stringify(wines)}` }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: Math.min(15, batch.length * 2) }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  if (data.stop_reason === 'refusal') throw new Error('The request was declined.')
  const text = (data.content || []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
  const out = parseLooseJSON(text)
  const asOf = new Date().toISOString().slice(0, 10)
  const ids = new Set(batch.map((b) => b.id))
  return ((out.results as any[]) || [])
    .filter((r) => r && ids.has(r.id) && num(r.unit) != null && num(r.unit)! > 0)
    .map((r) => ({
      id: r.id,
      unit: Math.round(num(r.unit)!),
      low: num(r.low) ?? undefined,
      high: num(r.high) ?? undefined,
      read: typeof r.read === 'string' && r.read ? r.read : undefined,
      currency,
      source: SEARCH_PROVIDER,
      asOf,
    }))
}

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

    // Engine selection: a dedicated price-feed key takes precedence; otherwise
    // Claude prices from live web listings. Only unconfigured with no AI key.
    if (!apiKey) {
      if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ configured: false, provider: SEARCH_PROVIDER, results: [] })
      if (!Array.isArray(bottles) || bottles.length === 0) return json({ configured: true, provider: SEARCH_PROVIDER, results: [] })
      const batch: InBottle[] = bottles.slice(0, 12)
      const results = await aiMarketSearch(batch, currency)
      return json({ configured: true, provider: SEARCH_PROVIDER, asOf: new Date().toISOString().slice(0, 10), currency, matched: results.length, total: batch.length, results })
    }
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
