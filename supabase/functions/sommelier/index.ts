// WineSnob — the private sommelier. Multi-turn advice grounded in the owner's
// own cellar, with optional photos (a dish, a menu, a shop shelf) via Claude
// Opus 4.8 vision. Self-contained so it deploys as a single file; the
// Anthropic key lives only as the ANTHROPIC_API_KEY function secret.

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

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: {
      type: 'string',
      description: 'The sommelier speaking: 1-3 short sentences. Warm, assured, no lists, no em dashes.',
    },
    quickReplies: {
      type: 'array',
      items: { type: 'string' },
      description: 'At most 4. Tappable answers when (and only when) the reply asks a clarifying question. Empty otherwise.',
    },
    picks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          bottleId: { type: 'string', description: 'The exact id from the cellar inventory, or "" when this is a bottle to buy.' },
          name: { type: 'string' },
          vintage: { type: 'string' },
          role: { type: 'string', enum: ['top', 'alternate', 'buy'] },
          why: { type: 'string', description: 'Why this bottle for this moment, grounded in the dish or occasion and the wine itself. 1-2 sentences.' },
          serve: { type: 'string', description: 'One compact line: serving temperature, decanting, glass. E.g. "16-18C, decant 1 hour, Bordeaux glass".' },
          sayThis: { type: 'string', description: 'One elegant sentence the owner can say to guests to sound like an expert. Specific to this wine and moment, never generic.' },
        },
        required: ['bottleId', 'name', 'vintage', 'role', 'why', 'serve', 'sayThis'],
      },
      description: 'At most 3 (one top, up to two alternates, or buys). Empty when answering a question or when still clarifying.',
    },
  },
  required: ['reply', 'quickReplies', 'picks'],
}

function systemPrompt(context: Record<string, unknown>): string {
  return `You are the resident sommelier of WineSnob, advising the owner of a private wine cellar.
You have the calm authority of a Master Sommelier at a great house: warm, precise, never showy.

Voice rules: 1-3 short sentences in "reply", plain prose, second person. British restraint. Never use
em dashes. Never use bullet points in prose. Be decisive: collectors want a verdict, not a survey.

The owner's data (JSON): ${JSON.stringify(context)}

How to advise:
- Prefer bottles the owner actually holds. A pick from the cellar carries its exact "id" as bottleId
  so the app can link to it. Choose one "top" pick and at most two "alternate" picks.
- Only when nothing in the cellar truly suits the moment, say so honestly and recommend what to buy
  instead (role "buy", bottleId ""). Real, buyable wines with producer and a sensible vintage.
- Respect drink windows and status: favour bottles that are ready; gently note when you are reaching
  for something young or past its peak, and when patience would be rewarded.
- Respect value and occasion: do not burn a trophy bottle on a Tuesday pizza, and do not be timid
  for a milestone. Quantity matters: if several guests, prefer wines held in enough bottles.
- If the request is ambiguous in a way that genuinely changes the pick (menu, number of guests,
  formality, red versus white mood), ask ONE short clarifying question with 2-4 quickReplies.
  One round of clarification at most, then commit. If you can reasonably assume, assume and answer.
- When a photo is provided (a dish, a menu, a table, a shop shelf), read it carefully and pair to
  what you actually see. If it is a menu, pick the through-line wine or ask which course matters most.
- "sayThis" is the owner's cheat line: one sentence they can repeat at the table that sounds like a
  connoisseur. Ground it in the specific wine (vintage character, site, producer style, pairing
  logic). Never generic praise.
- Wine questions without a pick needed (regions, decanting, glassware, storage, vintages): answer
  crisply in "reply" with empty picks.
- Use the owner's currency for any prices. Today's date is in the data; use it for drink windows.`
}


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
    const { turns = [], context = {} } = await req.json()
    if (!Array.isArray(turns) || turns.length === 0) return json({ error: 'No conversation provided.' }, 400)

    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) throw new Error('ANTHROPIC_API_KEY is not configured on this project.')

    // Rebuild the Anthropic message list. User turns may carry one photo;
    // assistant turns replay the exact JSON the model produced last time.
    const messages = turns.slice(-16).map((t: { role: string; text: string; image?: string | null }) => {
      if (t.role === 'assistant') return { role: 'assistant', content: t.text }
      const content: unknown[] = []
      if (t.image) {
        const { media_type, data } = parseDataUrl(t.image)
        content.push({ type: 'image', source: { type: 'base64', media_type, data } })
      }
      content.push({ type: 'text', text: t.text || 'See the photo.' })
      return { role: 'user', content }
    })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        system: systemPrompt(context),
        messages,
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      }),
    })
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
    const data = await res.json()
    logUsage(req, 'sommelier', data.usage)
    if (data.stop_reason === 'refusal') throw new Error('The request was declined.')
    const text = (data.content || []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
    const out = JSON.parse(text)
    return json({ reply: out.reply || '', quickReplies: out.quickReplies || [], picks: out.picks || [], raw: text })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
