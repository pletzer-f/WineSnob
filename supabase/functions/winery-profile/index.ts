// WineSnob — estate dossiers. Researches a wine estate ONCE with Claude +
// live web search, resolves a properly licensed photograph from Wikimedia
// (never scraped, always attributed), and caches the dossier in the global
// `wineries` table for every user. Self-contained; deploys as a single file.

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

// ---- per-user usage log (feeds the admin cost view). Never fatal. ----
function logUsage(req: Request | undefined, fn: string, usage: unknown) {
  try {
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const base = Deno.env.get('SUPABASE_URL')
    if (!svc || !base || !usage) return
    const u = usage as { input_tokens?: number; output_tokens?: number; server_tool_use?: { web_search_requests?: number } }
    let userId: string | null = null
    try {
      const token = (req?.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
      const payload = token.split('.')[1] || ''
      const b64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
      userId = JSON.parse(atob(b64)).sub || null
    } catch (_) {
      // anon or malformed token: log without attribution
    }
    const inTok = u.input_tokens || 0
    const outTok = u.output_tokens || 0
    const searches = u.server_tool_use?.web_search_requests || 0
    const cost = (inTok * 5 + outTok * 25) / 1_000_000 + searches * 0.01
    void fetch(`${base}/rest/v1/ai_usage`, {
      method: 'POST',
      headers: { apikey: svc, Authorization: `Bearer ${svc}`, 'content-type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: userId, fn, model: 'claude-opus-4-8', input_tokens: inTok, output_tokens: outTok, searches, cost_usd: Math.round(cost * 1e6) / 1e6 }),
    }).catch(() => {})
  } catch (_) {
    // logging must never break the feature
  }
}

// ---- Wikimedia: the page image with its licence and required credit ----
const WIKI_HEADERS = { 'user-agent': 'WineSnob/1.0 (wine cellar app; estate dossiers)' }

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

async function fileMeta(host: string, fileName: string): Promise<any | null> {
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

async function resolveImage(title: string): Promise<{ url: string; attribution: string; license: string; source: string } | null> {
  try {
    const q = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', redirects: '1',
      titles: title, prop: 'pageimages', piprop: 'thumbnail|name', pithumbsize: '1400',
    })
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${q}`, { headers: WIKI_HEADERS })
    const page = (await res.json())?.query?.pages?.[0]
    const url = page?.thumbnail?.source as string | undefined
    const fileName = page?.pageimage as string | undefined
    if (!url || !fileName) return null
    const found = (await fileMeta('https://commons.wikimedia.org', fileName)) || (await fileMeta('https://en.wikipedia.org', fileName))
    if (!found) return null
    const license = stripHtml(found.meta?.LicenseShortName?.value || '')
    // Only ship imagery we may legally display: free licences, with credit.
    if (!/cc|public domain|\bpd\b|no restrictions/i.test(license)) return null
    let artist = stripHtml(found.meta?.Artist?.value || '')
    if (artist.length > 60) artist = `${artist.slice(0, 57)}…`
    return {
      url,
      attribution: artist ? `${artist} · Wikimedia Commons` : 'Wikimedia Commons',
      license,
      source: found.descUrl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`,
    }
  } catch (_) {
    return null
  }
}

// ---- the shared cache table, via the service role ----
function restHeaders(svc: string): Record<string, string> {
  return { apikey: svc, Authorization: `Bearer ${svc}`, 'content-type': 'application/json' }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { producer = '', wine = '', region = '', country = '' } = await req.json()
    const name = String(producer).trim()
    if (!name) return json({ error: 'No producer given.' }, 400)
    const id = slug(name)
    if (!id) return json({ error: 'No producer given.' }, 400)

    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const base = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!svc || !base) return json({ error: 'Service configuration missing.' }, 500)
    if (!key) return json({ error: 'ANTHROPIC_API_KEY is not configured on this project.' }, 500)

    // Someone may have researched this estate already; the cache is global.
    const cached = await fetch(`${base}/rest/v1/wineries?id=eq.${encodeURIComponent(id)}&limit=1`, { headers: restHeaders(svc) })
    const cachedRows = cached.ok ? await cached.json() : []
    if (Array.isArray(cachedRows) && cachedRows.length) return json({ winery: cachedRows[0], cached: true })

    // Research from live sources.
    const hint = [wine && `producer of ${wine}`, region, country].filter(Boolean).join(', ')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 2000,
        system: SYSTEM,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
        messages: [{ role: 'user', content: `Research the wine estate "${name}"${hint ? ` (${hint})` : ''}.` }],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
    const data = await res.json()
    logUsage(req, 'winery-profile', data.usage)
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

    const image = r.wikipedia_title ? await resolveImage(String(r.wikipedia_title)) : null

    const row = {
      id,
      name: clean(r.name) || name,
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
