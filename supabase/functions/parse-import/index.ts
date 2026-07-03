// WineSnob — parse an uploaded cellar list (CSV / spreadsheet / PDF) into
// structured cellar entries with Claude Opus 4.8. Self-contained single file.

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

function parseDataUrl(dataUrl: string): { media_type: string; data: string } {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl)
  if (m) return { media_type: m[1], data: m[2] }
  return { media_type: 'application/octet-stream', data: dataUrl.replace(/^data:[^,]*,/, '') }
}

function decodeText(base64: string): string {
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes).slice(0, 200_000)
  } catch {
    return ''
  }
}

async function extractJSON(system: string, content: unknown[], schema: Record<string, unknown>, maxTokens = 8000, req?: Request, fnName = 'parse-import'): Promise<any> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured on this project.')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
      output_config: { format: { type: 'json_schema', schema } },
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  logUsage(req, fnName, data.usage)
  if (data.stop_reason === 'refusal') throw new Error('The request was declined.')
  const text = (data.content || []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
  return JSON.parse(text)
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reads: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          producer: { type: 'string' },
          vintage: { type: 'string' },
          region: { type: 'string' },
          colour: { type: 'string', enum: ['red', 'white', 'rose', 'sparkling', 'fortified'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          unit: { type: 'number' },
        },
        required: ['name', 'producer', 'vintage', 'region', 'colour', 'confidence', 'unit'],
      },
    },
  },
  required: ['reads'],
}

const SYSTEM = `You convert a wine collector's list into structured cellar entries.
The source may be a CSV, a spreadsheet export (e.g. CellarTracker), or a merchant invoice or order PDF.
Produce one entry per distinct wine with: name or cuvée, producer, vintage (4-digit year, "NV", or ""),
region or appellation, colour, your confidence, and a per-bottle value in euros taken from the source when
present, otherwise your best estimate, otherwise 0. Infer the colour from the wine when the source omits it.
Ignore header rows, totals, and non-wine lines.`


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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { file, filename = '' } = await req.json()
    if (!file) return json({ error: 'No file provided.' }, 400)
    const { media_type, data } = parseDataUrl(file)
    const isPdf = media_type.includes('pdf') || filename.toLowerCase().endsWith('.pdf')
    const content = isPdf
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } },
          { type: 'text', text: 'Extract every wine from this merchant list or invoice.' },
        ]
      : [{ type: 'text', text: `Extract every wine from this list (${filename || 'uploaded file'}):\n\n${decodeText(data)}` }]
    const out = await extractJSON(SYSTEM, content, SCHEMA, 8000, req)
    return json({ reads: out.reads || [] })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
