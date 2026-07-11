// WineSnob — read wine labels from photos with Claude Opus 4.8 vision.
// Self-contained so it deploys as a single file. The Anthropic key lives only
// as the ANTHROPIC_API_KEY function secret and is never shipped to the browser.

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
  return { media_type: 'image/jpeg', data: dataUrl.replace(/^data:[^,]*,/, '') }
}

async function extractJSON(system: string, content: unknown[], schema: Record<string, unknown>, maxTokens = 4096, req?: Request, fnName = 'read-label'): Promise<any> {
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

const SYSTEM = `You read wine bottle labels from photos for a fine-wine cellar app.
For each distinct bottle you can see, extract the wine name or cuvée, the producer or château,
the vintage (a 4-digit year, or "NV" for non-vintage, or "" if illegible), the region or appellation,
the colour, your confidence in the read (high / medium / low), and a rough current market value per
standard 750ml bottle in euros (your best estimate; 0 if you truly cannot guess).
Do not invent details you cannot see. When a field is uncertain, still return your best guess but lower
the confidence to medium or low so the collector knows to check it.
In "label" mode there is normally a single bottle. In "case" mode, read every bottle printed on the
case end-panel.`


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
    const { images = [], mode = 'label' } = await req.json()
    if (!Array.isArray(images) || images.length === 0) return json({ error: 'No images provided.' }, 400)
    const content = [
      ...images.map((img: string) => {
        const { media_type, data } = parseDataUrl(img)
        return { type: 'image', source: { type: 'base64', media_type, data } }
      }),
      {
        type: 'text',
        text:
          mode === 'case'
            ? 'Read every wine bottle visible on these case end-panels.'
            : images.length > 1
              ? `These are ${images.length} separate label photos. Read each one and return one entry per photo, in the same order.`
              : 'Read this wine label.',
      },
    ]
    const out = await extractJSON(SYSTEM, content, SCHEMA, 4096, req)
    return json({ reads: out.reads || [] })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
