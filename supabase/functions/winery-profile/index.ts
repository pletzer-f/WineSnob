// WineSnob — estate dossiers. Researches a wine estate ONCE (Sonnet for the
// dossier, a focused Opus pass to verify the annual production figure),
// resolves a properly licensed photograph — the estate itself when Commons
// has one, otherwise a licensed REGIONAL vineyard view labelled as such,
// never a bottle, label or cork — and caches everything in the global
// `wineries` table for every user. `imageOnly: true` re-resolves the image
// for an existing row without paying for research again.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

function slug(producer: string): string {
  return producer
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseLooseJSON(text: string): any {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON found in the research result.')
  return JSON.parse(text.slice(start, end + 1))
}

const SYSTEM = `You research wine estates for a fine-wine cellar app whose owners expect accuracy.
Use web search to ground the facts; do not invent. Respond with ONLY a JSON object (no markdown fences):
{"name":"", "summary":"", "history":"", "region":"", "country":"", "founded":"", "appellation":"", "classification":"", "hectares":"", "production":"", "second_wine":"", "style":"", "known_for":"", "wikipedia_title":""}
Rules:
- name: the estate's proper display name.
- summary: one elegant paragraph, 2-3 sentences, introducing the estate to a collector.
- history: 2-3 sentences of real history with dates (founding, defining moments, current stewardship).
- classification: official standing (e.g. "3eme Grand Cru Classe 1855", "Barolo DOCG"), or "".
- hectares / production: short strings like "66 ha" or "about 130,000 bottles a year", or "".
- second_wine: the estate's second label if it has one, or "".
- style: the house style in one or two sentences.
- known_for: the single thing this estate is most famous for, one sentence.
- wikipedia_title: the EXACT English Wikipedia article title for this estate if an article exists, else "".
- Any field you cannot verify from search: "". Never guess from memory alone.`

// The production figure gets its own verification pass on the strongest
// model: it is the number collectors quote, so it is checked, not inherited.
const PRODUCTION_SYSTEM = `You verify production facts about ONE wine estate. Use web search (estate site,
importers, appellation bodies, serious trade press). Respond with ONLY JSON:
{"production":"", "hectares":""}
- production: the estate's annual output in its own terms, e.g. "about 240,000 bottles a year" or
  "roughly 20,000 cases annually". Grand vin vs total: say which if sources distinguish.
- hectares: vineyard area like "55 ha", when confidently found.
- Empty string for anything you cannot verify from the sources you actually read. Never guess.`

// ---- per-user usage log (feeds the admin cost view). Never fatal. ----
// Prices per model so mixed Sonnet/Opus pipelines bill correctly.
const MODEL_RATES: Record<string, [number, number]> = {
  'claude-opus-4-8': [5, 25],
  'claude-sonnet-4-6': [3, 15],
}
function logUsage(req: Request | undefined, fn: string, usage: unknown, model = 'claude-opus-4-8') {
  try {
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const base = Deno.env.get('SUPABASE_URL')
    if (!svc || !base || !usage) return
    const u = usage as { input_tokens?: number; output_tokens?: number; server_tool_use?: { web_search_requests?: number } }
    let userId: string | null = null
    try {
      const token = (req?.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
      const payload = token.split('.')[1] || ''
      const pad = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
      userId = JSON.parse(atob(pad)).sub || null
    } catch (_) {
      // anon or malformed token: log without attribution
    }
    const inTok = u.input_tokens || 0
    const outTok = u.output_tokens || 0
    const searches = u.server_tool_use?.web_search_requests || 0
    const [rIn, rOut] = MODEL_RATES[model] || MODEL_RATES['claude-opus-4-8']
    const cost = (inTok * rIn + outTok * rOut) / 1_000_000 + searches * 0.01
    void fetch(`${base}/rest/v1/ai_usage`, {
      method: 'POST',
      headers: { apikey: svc, Authorization: `Bearer ${svc}`, 'content-type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: userId, fn, model, input_tokens: inTok, output_tokens: outTok, searches, cost_usd: Math.round(cost * 1e6) / 1e6 }),
    }).catch(() => {})
  } catch (_) {
    // logging must never break the feature
  }
}

// ---- credit gate: signed-in users only; new work pauses below the floor ----
// The ledger meters every cent regardless (a database trigger on ai_usage);
// this gate only decides whether NEW work may start. A task already under
// way (any usage in the last 3 minutes) may always finish, so chunked runs
// never die halfway. On internal errors the gate fails open: it must never
// take a feature down.
const CREDIT_FLOOR = -10
async function creditGate(req: Request): Promise<Response | null> {
  let claims: { role?: string; sub?: string } = {}
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const payload = token.split('.')[1] || ''
    const pad = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
    claims = JSON.parse(atob(pad))
  } catch (_) {
    claims = {}
  }
  if (claims.role !== 'authenticated' || !claims.sub) {
    return json({ error: 'Sign in to use the AI features.' }, 401)
  }
  try {
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const base = Deno.env.get('SUPABASE_URL')
    if (!svc || !base) return null
    const h = { apikey: svc, Authorization: `Bearer ${svc}` }
    const since = new Date(Date.now() - 180000).toISOString()
    const [balRes, activeRes] = await Promise.all([
      fetch(`${base}/rest/v1/credit_balances?user_id=eq.${claims.sub}&select=balance_usd`, { headers: h }),
      fetch(`${base}/rest/v1/ai_usage?user_id=eq.${claims.sub}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=1`, { headers: h }),
    ])
    const bal = balRes.ok ? Number(((await balRes.json()) as { balance_usd?: number }[])?.[0]?.balance_usd ?? 0) : 0
    const active = activeRes.ok ? (((await activeRes.json()) as unknown[])?.length ?? 0) > 0 : false
    if (bal < CREDIT_FLOOR && !active) {
      return json({ error: 'Your usage credit is used up. Ask your administrator to top up, then try again.', code: 'credit_floor' }, 402)
    }
  } catch (_) {
    // fail open
  }
  return null
}

// ---- Wikimedia: find a photograph of the ESTATE, with licence + credit ----
const WIKI_HEADERS = { 'user-agent': 'WineSnob/1.0 (wine cellar app; estate dossiers)' }

// Scratch diagnostics for the current request, surfaced when debug is asked.
let lastDebug: Record<string, unknown> = {}

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

interface Candidate {
  title: string
  url?: string
  width?: number
  height?: number
  meta?: any
  descUrl?: string
}

/** Score a Commons file by how likely it shows the estate itself. Words that
 * are part of the estate's own name carry no weight (nearly every Palmer file
 * says "château"); bottles, labels, corks and portrait shots score down. */
function scoreCandidate(c: Candidate, estateName: string): number {
  const t = decodeURIComponent(c.title).toLowerCase()
  if (/\.(svg|pdf|ogg|webm|gif)$/.test(t)) return -1000
  let score = 0
  const nameTokens = slug(estateName).split('-').filter((w) => w.length > 2)
  for (const w of nameTokens) if (t.includes(w)) score += 8
  const inName = (w: string) => nameTokens.some((n) => n.includes(w) || w.includes(n))
  const BUILDING = ['chateau', 'castle', 'schloss', 'winery', 'weingut', 'cantina', 'bodega', 'estate', 'tenuta', 'domaine', 'manor', 'facade', 'building', 'maison', 'chai', 'cellar', 'abbey', 'court', 'tower']
  const PLACE = ['vineyard', 'vignoble', 'weinberg', 'vigne', 'aerial', 'panorama', 'park', 'garden', 'entrance', 'gate']
  for (const w of BUILDING) if (t.includes(w) && !inName(w)) score += 30
  for (const w of PLACE) if (t.includes(w) && !inName(w)) score += 16
  if (/label|etikett|etiquette|bottle|bouteille|flasche|magnum|cork|capsule|caps|glass|verre|logo|map|karte|plan\b|blason|coat|arms|barrel|cask|menu|tasting|degustation/.test(t)) score -= 70
  if (/detail|close-?up|macro|crop/.test(t)) score -= 25
  if (/(19|20)\d{2}/.test(t)) score -= 18 // vintage years in filenames are usually bottle shots
  if (c.width && c.height) {
    if (c.width > c.height * 1.15) score += 14 // buildings and vineyards lie in landscape
    if (c.height > c.width * 1.15) score -= 14 // bottles stand in portrait
    if (c.width >= 1000) score += 5
  }
  return score
}

async function commonsSearch(term: string): Promise<Candidate[]> {
  try {
    const q = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2',
      generator: 'search', gsrsearch: term, gsrnamespace: '6', gsrlimit: '30',
      prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '1600',
    })
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, { headers: WIKI_HEADERS })
    const pages = (await res.json())?.query?.pages || []
    return pages
      .map((p: any) => {
        const info = p.imageinfo?.[0]
        if (!info) return null
        return {
          title: p.title as string,
          url: (info.thumburl || info.url) as string,
          width: info.width as number,
          height: info.height as number,
          meta: info.extmetadata,
          descUrl: info.descriptionurl as string,
        }
      })
      .filter(Boolean) as Candidate[]
  } catch (_) {
    return []
  }
}

async function pageImageCandidate(title: string): Promise<Candidate | null> {
  try {
    const q = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', redirects: '1',
      titles: title, prop: 'pageimages', piprop: 'thumbnail|name', pithumbsize: '1600',
    })
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${q}`, { headers: WIKI_HEADERS })
    const page = (await res.json())?.query?.pages?.[0]
    if (!page?.thumbnail?.source || !page?.pageimage) return null
    const c: Candidate = {
      title: `File:${page.pageimage}`,
      url: page.thumbnail.source,
      width: page.thumbnail.width,
      height: page.thumbnail.height,
    }
    const found = (await fileMeta('https://commons.wikimedia.org', page.pageimage)) || (await fileMeta('https://en.wikipedia.org', page.pageimage))
    if (!found) return null
    c.meta = found.meta
    c.descUrl = found.descUrl
    return c
  } catch (_) {
    return null
  }
}

async function fileMeta(host: string, fileName: string): Promise<{ meta: any; descUrl?: string } | null> {
  try {
    const q = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2',
      titles: `File:${fileName}`, prop: 'imageinfo', iiprop: 'url|extmetadata',
    })
    const res = await fetch(`${host}/w/api.php?${q}`, { headers: WIKI_HEADERS })
    const info = (await res.json())?.query?.pages?.[0]?.imageinfo?.[0]
    if (!info?.extmetadata) return null
    return { meta: info.extmetadata, descUrl: info.descriptionurl as string | undefined }
  } catch (_) {
    return null
  }
}

function licensed(c: Candidate): { url: string; attribution: string; license: string; source: string } | null {
  if (!c.url || !c.meta) return null
  const license = stripHtml(c.meta?.LicenseShortName?.value || '')
  if (!/cc|public domain|\bpd\b|no restrictions/i.test(license)) return null
  let artist = stripHtml(c.meta?.Artist?.value || '')
  if (artist.length > 60) artist = `${artist.slice(0, 57)}…`
  return {
    url: c.url,
    attribution: artist ? `${artist} · Wikimedia Commons` : 'Wikimedia Commons',
    license,
    source: c.descUrl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(c.title)}`,
  }
}

/** A small thumbnail of a Commons file, for the vision pass. */
function smallThumb(url: string): string {
  return url.replace(/\/(\d+)px-/, '/320px-')
}

function b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(bin)
}

/** Claude LOOKS at the shortlisted photographs and picks the best one for
 * the given question. Filenames lie; pixels do not. Costs a fraction of a
 * cent, once per estate ever. Thumbnails are downloaded here and passed as
 * base64: Wikimedia refuses the API's own URL fetcher. */
async function visionPick(key: string, req: Request, question: string, candidates: Candidate[]): Promise<Candidate | null> {
  if (!candidates.length) return null
  try {
    const downloads = await Promise.all(
      candidates.map(async (c) => {
        try {
          const r = await fetch(smallThumb(c.url!), { headers: WIKI_HEADERS })
          if (!r.ok) return null
          const type = (r.headers.get('content-type') || 'image/jpeg').split(';')[0]
          if (!/^image\/(jpeg|png|webp)$/.test(type)) return null
          const buf = await r.arrayBuffer()
          if (buf.byteLength > 2_000_000) return null
          return { c, type, data: b64(buf) }
        } catch (_) {
          return null
        }
      }),
    )
    const pool = downloads.filter(Boolean) as { c: Candidate; type: string; data: string }[]
    lastDebug.downloaded = pool.length
    if (!pool.length) return null
    const content: unknown[] = pool.map((d) => ({ type: 'image', source: { type: 'base64', media_type: d.type, data: d.data } }))
    content.push({
      type: 'text',
      text: `These ${pool.length} photographs are numbered 1 to ${pool.length} in order. ${question} Never choose wine bottles, labels, corks, glasses, barrels, people, paintings, sculptures, maps, logos or documents. Reply with ONLY JSON: {"pick": n} (1-based), or {"pick": 0} if none of them qualifies.`,
    })
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 100, messages: [{ role: 'user', content }] }),
    })
    if (!res.ok) {
      lastDebug.visionError = `${res.status}: ${(await res.text()).slice(0, 600)}`
      console.error('visionPick API error', lastDebug.visionError)
      return null
    }
    const data = await res.json()
    logUsage(req, 'winery-profile', data.usage)
    const text = (data.content || []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
    const n = Number(parseLooseJSON(text).pick)
    lastDebug.visionPickN = n
    return Number.isInteger(n) && n >= 1 && n <= pool.length ? pool[n - 1].c : null
  } catch (e) {
    lastDebug.visionThrow = e instanceof Error ? e.message : String(e)
    console.error('visionPick failed', lastDebug.visionThrow)
    return null
  }
}

/** Only raster thumbnails go to the vision pass (an original .tif or a
 * multi-megabyte source would sink the whole request). */
const visionSafe = (u?: string) => !!u && /\.(jpe?g|png|webp)$/i.test(u)

function shortlist(candidates: Candidate[], scoreAgainst: string): Candidate[] {
  return candidates
    .filter((c) => visionSafe(c.url) && licensed(c))
    .map((c) => ({ c, score: scoreCandidate(c, scoreAgainst) }))
    .filter((x) => x.score > -40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.c)
}

/** The photograph: the estate itself when Commons has one; otherwise a
 * licensed vineyard view of the estate's REGION, labelled as a regional
 * view. The engraving in the app remains the very last resort. */
async function resolveImage(
  estateName: string,
  key: string,
  req: Request,
  wikipediaTitle?: string,
  region?: string,
): Promise<{ url: string; attribution: string; license: string; source: string } | null> {
  const candidates = await commonsSearch(`"${estateName}"`)
  if (candidates.length < 8) {
    const broad = await commonsSearch(`${estateName} vineyard winery`)
    for (const c of broad) if (!candidates.some((x) => x.title === c.title)) candidates.push(c)
  }
  if (wikipediaTitle) {
    const lead = await pageImageCandidate(wikipediaTitle)
    if (lead && !candidates.some((c) => c.title === lead.title)) candidates.push(lead)
  }
  const pool = shortlist(candidates, estateName)
  lastDebug = { candidates: candidates.length, pool: pool.map((c) => `${c.title} | ${smallThumb(c.url!)}`) }
  const picked = await visionPick(
    key,
    req,
    `Which ONE best shows the wine estate "${estateName}" itself: its chateau or winery building, courtyard, gate, cellar architecture, or its vineyards and landscape?`,
    pool,
  )
  if (picked) return licensed(picked)

  // Regional fallback: an honest, beautiful vineyard view from the estate's
  // own wine country, clearly labelled as a regional view.
  if (region) {
    const regionCands = await commonsSearch(`${region} vineyard`)
    const regionPool = shortlist(regionCands, region)
    lastDebug.regionPool = regionPool.map((c) => c.title)
    const regionPick = await visionPick(
      key,
      req,
      `Which ONE is the most beautiful photograph of wine vineyards or wine-country landscape in ${region}: rows of vines, rolling vineyard hills, or a vineyard with buildings in the distance?`,
      regionPool,
    )
    if (regionPick) {
      const lic = licensed(regionPick)
      if (lic) return { ...lic, attribution: `Regional view · ${lic.attribution}` }
    }
  }
  return null
}

// ---- the shared cache table, via the service role ----
function restHeaders(svc: string): Record<string, string> {
  return { apikey: svc, Authorization: `Bearer ${svc}`, 'content-type': 'application/json' }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const gated = await creditGate(req)
  if (gated) return gated
  try {
    const { producer = '', wine = '', region = '', country = '', imageOnly = false, debug = false } = await req.json()
    const name = String(producer).trim()
    if (!name) return json({ error: 'No producer given.' }, 400)
    const id = slug(name)
    if (!id) return json({ error: 'No producer given.' }, 400)

    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const base = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!svc || !base) return json({ error: 'Service configuration missing.' }, 500)

    const cached = await fetch(`${base}/rest/v1/wineries?id=eq.${encodeURIComponent(id)}&limit=1`, { headers: restHeaders(svc) })
    const cachedRows = cached.ok ? await cached.json() : []
    const existing = Array.isArray(cachedRows) && cachedRows.length ? cachedRows[0] : null

    // Re-resolve only the photograph for an existing dossier: vision calls
    // only, no research cost.
    if (imageOnly) {
      if (!existing) return json({ error: 'No dossier to refresh.' }, 404)
      if (!key) return json({ error: 'ANTHROPIC_API_KEY is not configured on this project.' }, 500)
      const image = await resolveImage(existing.name || name, key, req, undefined, existing.region || existing.appellation || undefined)
      const patch = {
        image_url: image?.url ?? null,
        image_attribution: image?.attribution ?? null,
        image_license: image?.license ?? null,
        image_source_url: image?.source ?? null,
      }
      const up = await fetch(`${base}/rest/v1/wineries?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...restHeaders(svc), Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      })
      if (!up.ok) throw new Error(`Could not update the dossier: ${await up.text()}`)
      const rows = await up.json()
      return json({ winery: Array.isArray(rows) ? rows[0] : { ...existing, ...patch }, ...(debug ? { debug: lastDebug } : {}) })
    }

    if (existing) return json({ winery: existing, cached: true })
    if (!key) return json({ error: 'ANTHROPIC_API_KEY is not configured on this project.' }, 500)

    // Research from live sources. Sonnet writes the dossier.
    const hint = [wine && `producer of ${wine}`, region, country].filter(Boolean).join(', ')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: SYSTEM,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
        messages: [{ role: 'user', content: `Research the wine estate "${name}"${hint ? ` (${hint})` : ''}.` }],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
    const data = await res.json()
    logUsage(req, 'winery-profile', data.usage, 'claude-sonnet-4-6')
    if (data.stop_reason === 'refusal') throw new Error('The research request was declined.')
    const text = (data.content || [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
    const r = parseLooseJSON(text)

    const clean = (v: unknown) => {
      const s = typeof v === 'string' ? v.trim() : ''
      return s && !/^(unknown|n\/a|none)$/i.test(s) ? s : null
    }

    const displayName = clean(r.name) || name

    // Opus verifies the production figure (and vineyard area) separately;
    // its confirmed numbers override the dossier's provisional ones.
    try {
      const prodRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-opus-4-8',
          max_tokens: 500,
          system: PRODUCTION_SYSTEM,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
          messages: [{ role: 'user', content: `Estate: "${displayName}"${clean(r.region) ? `, ${clean(r.region)}` : ''}${clean(r.country) ? `, ${clean(r.country)}` : ''}. Verify its annual production and vineyard area.` }],
        }),
      })
      if (prodRes.ok) {
        const prodData = await prodRes.json()
        logUsage(req, 'winery-profile', prodData.usage, 'claude-opus-4-8')
        if (prodData.stop_reason !== 'refusal') {
          const prodText = (prodData.content || []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
          const prod = parseLooseJSON(prodText)
          if (clean(prod.production)) r.production = prod.production
          if (clean(prod.hectares)) r.hectares = prod.hectares
        }
      } else {
        await prodRes.body?.cancel()
      }
    } catch (_) {
      // the dossier's own figure stands if the verification pass fails
    }

    const image = await resolveImage(displayName, key, req, clean(r.wikipedia_title) || undefined, clean(r.region) || clean(r.appellation) || (region ? String(region) : undefined))

    const row = {
      id,
      name: displayName,
      summary: clean(r.summary),
      history: clean(r.history),
      region: clean(r.region) || (region ? String(region) : null),
      country: clean(r.country) || (country ? String(country) : null),
      founded: clean(r.founded),
      appellation: clean(r.appellation),
      classification: clean(r.classification),
      hectares: clean(r.hectares),
      production: clean(r.production),
      second_wine: clean(r.second_wine),
      style: clean(r.style),
      known_for: clean(r.known_for),
      image_url: image?.url ?? null,
      image_attribution: image?.attribution ?? null,
      image_license: image?.license ?? null,
      image_source_url: image?.source ?? null,
    }

    const up = await fetch(`${base}/rest/v1/wineries`, {
      method: 'POST',
      headers: { ...restHeaders(svc), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(row),
    })
    if (!up.ok) throw new Error(`Could not store the dossier: ${await up.text()}`)
    const stored = await up.json()
    return json({ winery: Array.isArray(stored) ? stored[0] : row })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
