// WineSnob — administration. User management and per-user AI cost, gated on
// membership of the admin_users table (which has no RLS policies, so only
// this function's service role can read it; users can never self-promote).
//
// Uses the SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY env
// vars that Supabase injects into every edge function. Dependency-free.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } })
}

const URL_BASE = Deno.env.get('SUPABASE_URL')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const svcHeaders = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  'content-type': 'application/json',
}

/** PostgREST query with the service role (bypasses RLS). */
async function rest(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...svcHeaders, ...(init?.headers || {}) } })
  if (!res.ok) throw new Error(`db ${res.status}: ${await res.text()}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

/** GoTrue admin API with the service role. */
async function authAdmin(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${URL_BASE}/auth/v1/admin/${path}`, { ...init, headers: { ...svcHeaders, ...(init?.headers || {}) } })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.msg || data?.message || `auth ${res.status}`)
  return data
}

/** Resolve the calling user from their JWT, or null. */
async function caller(req: Request): Promise<{ id: string; email: string } | null> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const res = await fetch(`${URL_BASE}/auth/v1/user`, { headers: { apikey: SERVICE, Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  const u = await res.json()
  return u?.id ? { id: u.id, email: u.email || '' } : null
}

async function isAdmin(userId: string): Promise<boolean> {
  const rows = await rest(`admin_users?user_id=eq.${userId}&select=user_id`)
  return Array.isArray(rows) && rows.length > 0
}

function monthAgoISO(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 30)
  return d.toISOString()
}

async function listUsers() {
  const [authList, profiles, bottles, drinks, wishes, usage, admins] = await Promise.all([
    authAdmin('users?page=1&per_page=200'),
    rest('profiles?select=user_id,name,onboarded,currency'),
    rest('bottles?select=user_id,quantity,unit,market_unit'),
    rest('drinks?select=user_id'),
    rest('wishlist?select=user_id'),
    rest(`ai_usage?select=user_id,cost_usd,created_at&created_at=gte.${monthAgoISO()}`),
    rest('admin_users?select=user_id'),
  ])
  const users = (authList?.users || authList || []) as any[]
  const pmap = new Map((profiles as any[]).map((p) => [p.user_id, p]))
  const adminSet = new Set((admins as any[]).map((a) => a.user_id))

  const agg = <T>(rows: any[], fold: (acc: T, r: any) => T, zero: T) => {
    const m = new Map<string, T>()
    rows.forEach((r) => m.set(r.user_id, fold(m.get(r.user_id) ?? zero, r)))
    return m
  }
  const bAgg = agg<{ n: number; v: number }>(bottles as any[], (a, r) => ({ n: a.n + (r.quantity || 0), v: a.v + (r.quantity || 0) * Number(r.market_unit ?? r.unit ?? 0) }), { n: 0, v: 0 })
  const dAgg = agg<number>(drinks as any[], (a) => a + 1, 0)
  const wAgg = agg<number>(wishes as any[], (a) => a + 1, 0)
  const uAgg = agg<{ cost: number; calls: number }>(usage as any[], (a, r) => ({ cost: a.cost + Number(r.cost_usd || 0), calls: a.calls + 1 }), { cost: 0, calls: 0 })

  return users
    .map((u) => {
      const p = pmap.get(u.id)
      return {
        id: u.id,
        email: u.email,
        name: p?.name || '',
        createdAt: (u.created_at || '').slice(0, 10),
        lastSignIn: (u.last_sign_in_at || '').slice(0, 10) || null,
        confirmed: !!(u.email_confirmed_at || u.confirmed_at),
        onboarded: !!p?.onboarded,
        currency: p?.currency || 'EUR',
        bottles: bAgg.get(u.id)?.n || 0,
        cellarValue: Math.round(bAgg.get(u.id)?.v || 0),
        drinks: dAgg.get(u.id) || 0,
        wishes: wAgg.get(u.id) || 0,
        aiCost30d: Math.round((uAgg.get(u.id)?.cost || 0) * 100) / 100,
        aiCalls30d: uAgg.get(u.id)?.calls || 0,
        isAdmin: adminSet.has(u.id),
      }
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const me = await caller(req)
    if (!me) return json({ error: 'Not signed in.' }, 401)
    const admin = await isAdmin(me.id)

    const body = await req.json().catch(() => ({}))
    const action = body?.action as string

    // The only action available to non-admins: asking whether they are one.
    if (action === 'whoami') return json({ id: me.id, email: me.email, admin })
    if (!admin) return json({ error: 'This account has no admin access.' }, 403)

    switch (action) {
      case 'listUsers': {
        return json({ users: await listUsers() })
      }
      case 'overview': {
        const [users, totals] = await Promise.all([listUsers(), rest(`ai_usage?select=cost_usd&created_at=gte.${monthAgoISO()}`)])
        const spend30d = (totals as any[]).reduce((a, r) => a + Number(r.cost_usd || 0), 0)
        return json({
          users: users.length,
          bottles: users.reduce((a, u) => a + u.bottles, 0),
          aiSpend30d: Math.round(spend30d * 100) / 100,
        })
      }
      case 'createUser': {
        const { email, password, name } = body
        if (!email || !password) return json({ error: 'Email and password are required.' }, 400)
        if (String(password).length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)
        const created = await authAdmin('users', {
          method: 'POST',
          body: JSON.stringify({ email, password, email_confirm: true }),
        })
        // The signup trigger creates the profile row; stamp the display name.
        if (created?.id && name) {
          await rest(`profiles?user_id=eq.${created.id}`, { method: 'PATCH', body: JSON.stringify({ name }) }).catch(() => null)
        }
        return json({ ok: true, id: created?.id, email: created?.email })
      }
      case 'setPassword': {
        const { userId, password } = body
        if (!userId || !password) return json({ error: 'User and password are required.' }, 400)
        if (String(password).length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)
        await authAdmin(`users/${userId}`, { method: 'PUT', body: JSON.stringify({ password }) })
        return json({ ok: true })
      }
      case 'deleteUser': {
        const { userId } = body
        if (!userId) return json({ error: 'User is required.' }, 400)
        if (userId === me.id) return json({ error: 'You cannot delete your own admin account.' }, 400)
        // All data tables cascade from auth.users, so this removes everything.
        // (Billed ai_usage rows survive with user_id nulled; statements are
        // immutable and keep the frozen email.)
        await authAdmin(`users/${userId}`, { method: 'DELETE' })
        return json({ ok: true })
      }

      // ---- billing ----

      case 'usageDetail': {
        // The outstanding (unbilled) balance with its per-function breakdown,
        // recent activity, and the last statement for context.
        const { userId } = body
        if (!userId) return json({ error: 'User is required.' }, 400)
        const [unbilled, recent, lastStmt] = await Promise.all([
          rest(`ai_usage?select=fn,input_tokens,output_tokens,searches,cost_usd,created_at&user_id=eq.${userId}&statement_id=is.null&order=created_at.asc`),
          rest(`ai_usage?select=fn,cost_usd,searches,created_at,statement_id&user_id=eq.${userId}&order=created_at.desc&limit=14`),
          rest(`billing_statements?select=id,seq,period_start,period_end,total_usd,created_at&user_id=eq.${userId}&order=created_at.desc&limit=1`),
        ])
        const byFn = new Map<string, { fn: string; calls: number; input_tokens: number; output_tokens: number; searches: number; usd: number }>()
        let total = 0
        for (const r of (unbilled as any[]) || []) {
          const l = byFn.get(r.fn) || { fn: r.fn, calls: 0, input_tokens: 0, output_tokens: 0, searches: 0, usd: 0 }
          l.calls += 1
          l.input_tokens += r.input_tokens || 0
          l.output_tokens += r.output_tokens || 0
          l.searches += r.searches || 0
          l.usd += Number(r.cost_usd || 0)
          byFn.set(r.fn, l)
          total += Number(r.cost_usd || 0)
        }
        const lines = [...byFn.values()]
          .map((l) => ({ ...l, usd: Math.round(l.usd * 10000) / 10000 }))
          .sort((a, b) => b.usd - a.usd)
        const rows = (unbilled as any[]) || []
        return json({
          outstanding: {
            totalUsd: Math.round(total * 10000) / 10000,
            calls: rows.length,
            since: rows[0]?.created_at || null,
            until: rows[rows.length - 1]?.created_at || null,
          },
          lines,
          recent: recent || [],
          lastStatement: (lastStmt as any[])?.[0] || null,
        })
      }

      case 'settleUser': {
        // Atomic in the database: claims every unbilled row, freezes the
        // totals into an immutable statement, balance restarts at zero.
        const { userId, note } = body
        if (!userId) return json({ error: 'User is required.' }, 400)
        const res = await fetch(`${URL_BASE}/rest/v1/rpc/create_billing_statement`, {
          method: 'POST',
          headers: svcHeaders,
          body: JSON.stringify({
            p_user: userId,
            p_until: new Date().toISOString(),
            p_admin: me.id,
            p_note: note || null,
          }),
        })
        const text = await res.text()
        const data = text ? JSON.parse(text) : null
        if (!res.ok) {
          const msg = data?.message || 'Could not settle this account.'
          return json({ error: msg.replace(/^.*Nothing to settle.*$/s, 'Nothing to settle: no unbilled usage.') }, 400)
        }
        return json({ statement: data })
      }

      case 'listStatements': {
        const { userId } = body
        const filter = userId ? `&user_id=eq.${userId}` : ''
        const rows = await rest(`billing_statements?select=*${filter}&order=created_at.desc&limit=200`)
        return json({ statements: rows || [] })
      }

      // ---- credits ----

      case 'grantCredits': {
        // Full manual control: the admin decides every cent. Grants are
        // append-only ledger entries; the trigger-locked ledger cannot be
        // edited afterwards, so a mistaken grant is corrected by a new
        // negative 'adjustment', never by rewriting history.
        const { userId, amountUsd, note } = body
        const amt = Number(amountUsd)
        if (!userId) return json({ error: 'User is required.' }, 400)
        if (!Number.isFinite(amt) || amt === 0 || Math.abs(amt) > 500) {
          return json({ error: 'Amount must be between -500 and 500 dollars, and not zero.' }, 400)
        }
        await rest('credit_ledger', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: userId,
            delta_usd: Math.round(amt * 100) / 100,
            kind: amt > 0 ? 'grant' : 'adjustment',
            note: note || null,
            created_by: me.id,
          }),
        })
        const bal = await rest(`credit_balances?user_id=eq.${userId}&select=balance_usd`)
        return json({ ok: true, balance: Number((bal as any[])?.[0]?.balance_usd ?? 0) })
      }

      case 'creditDetail': {
        const { userId } = body
        if (!userId) return json({ error: 'User is required.' }, 400)
        const [bal, entries] = await Promise.all([
          rest(`credit_balances?user_id=eq.${userId}&select=balance_usd`),
          rest(`credit_ledger?select=delta_usd,kind,note,created_at&user_id=eq.${userId}&order=created_at.desc&limit=20`),
        ])
        return json({
          balance: Number((bal as any[])?.[0]?.balance_usd ?? 0),
          entries: entries || [],
        })
      }
      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
