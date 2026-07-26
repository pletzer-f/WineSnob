import { hasSupabase, supabase } from '@/lib/supabase'

/** One row of the admin user list, as returned by the `admin` edge function. */
export interface AdminUser {
  id: string
  email: string
  name: string
  createdAt: string
  lastSignIn: string | null
  confirmed: boolean
  onboarded: boolean
  currency: string
  bottles: number
  cellarValue: number
  drinks: number
  wishes: number
  aiCost30d: number
  aiCalls30d: number
  isAdmin: boolean
  insurance: boolean
  /** The commercial rate: billed = cost x markup. Internal bills at cost. */
  markup: number
  internal: boolean
  unbilledCost: number
  unbilledBilled: number
  unbilledCalls: number
}

export interface AdminOverview {
  users: number
  bottles: number
  aiSpend30d: number
  /** Your live Anthropic meter for the period. */
  anthropic: { cost: number; inputTokens: number; outputTokens: number; searches: number; calls: number }
  /** Settled statements in the period, internal accounts excluded. */
  revenueBilled30d: number
  /** What you could bill today: everyone's unbilled usage at their markup. */
  revenueOutstanding: number
}

export interface WhoAmI {
  id: string
  email: string
  admin: boolean
}

// ---- billing ----

export interface UsageLine {
  fn: string
  calls: number
  input_tokens: number
  output_tokens: number
  searches: number
  usd: number
  /** usd at the account's markup, what the customer pays. */
  billed?: number
}

export interface UsageDetail {
  outstanding: { totalUsd: number; billedUsd?: number; calls: number; since: string | null; until: string | null }
  markup?: number
  internal?: boolean
  /** The ledger sum: money paid in minus settled statements. */
  balanceOnFile?: number
  lines: UsageLine[]
  recent: { fn: string; cost_usd: number; searches: number; created_at: string; statement_id: string | null }[]
  lastStatement: { id: string; seq: number; period_start: string | null; period_end: string; total_usd: number; billed_usd?: number | null; created_at: string } | null
}

export interface BillingStatement {
  id: string
  seq: number
  user_id: string | null
  user_email: string | null
  period_start: string | null
  period_end: string
  calls: number
  input_tokens: number
  output_tokens: number
  searches: number
  total_usd: number
  /** Frozen at settle time; older statements predate markups (billed = cost). */
  markup?: number | null
  billed_usd?: number | null
  lines: UsageLine[]
  note: string | null
  created_at: string
}

export interface CreditEntry {
  delta_usd: number
  kind: 'grant' | 'usage' | 'adjustment'
  note: string | null
  created_at: string
}

export interface CreditDetail {
  balance: number
  entries: CreditEntry[]
}

/** Human names for the AI features, for cost breakdowns and statements. */
export function fnLabel(fn: string): string {
  const map: Record<string, string> = {
    'read-label': 'Label reading',
    'parse-import': 'List import',
    sommelier: 'Sommelier',
    'value-cellar': 'Market valuation',
    'winery-profile': 'Estate research',
  }
  return map[fn] || fn
}

export function statementNumber(seq: number): string {
  return `WS-${String(seq).padStart(4, '0')}`
}

/** Call the admin edge function. All actions are gated server-side on
 * admin_users membership; this client never sees privileged keys. In the
 * offline demo a local mock ledger answers, so the console is explorable. */
export async function adminCall<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  if (!hasSupabase) return demoAdmin(action, params || {}) as T
  const { data, error } = await supabase.functions.invoke('admin', { body: { action, ...(params || {}) } })
  if (error) {
    // Non-2xx responses land here; surface the function's own message.
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json().catch(() => null)
      if (body?.error) throw new Error(body.error)
    }
    throw new Error(error.message || 'Admin request failed')
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
  return data as T
}

/** A strong random password for created accounts and resets. */
export function generatePassword(length = 14): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!#%+'
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

// ---- offline demo: a small mock console with a working billing ledger ----

const demoUsers: AdminUser[] = [
  { id: 'demo-owner', email: 'owner@winesnob.app', name: 'The Owner', createdAt: '2026-06-02', lastSignIn: '2026-07-25', confirmed: true, onboarded: true, currency: 'EUR', bottles: 82, cellarValue: 34738, drinks: 7, wishes: 5, aiCost30d: 31.79, aiCalls30d: 101, isAdmin: true, insurance: true, markup: 1, internal: true, unbilledCost: 0, unbilledBilled: 0, unbilledCalls: 0 },
  { id: 'demo-guest', email: 'guest@winesnob.app', name: 'A Guest', createdAt: '2026-07-01', lastSignIn: '2026-07-20', confirmed: true, onboarded: true, currency: 'EUR', bottles: 24, cellarValue: 6120, drinks: 2, wishes: 1, aiCost30d: 4.12, aiCalls30d: 18, isAdmin: false, insurance: false, markup: 1.5, internal: false, unbilledCost: 0, unbilledBilled: 0, unbilledCalls: 0 },
]

const demoCfg = new Map<string, { markup: number; internal: boolean }>([
  ['demo-owner', { markup: 1, internal: true }],
  ['demo-guest', { markup: 1.5, internal: false }],
])
const demoRate = (id: string) => {
  const c = demoCfg.get(id) || { markup: 1.5, internal: false }
  return c.internal ? { markup: 1, internal: true } : c
}
const demoOutstanding = (id: string) => {
  const lines = demoUnbilled.get(id) || []
  const cost = lines.reduce((a, l) => a + l.usd, 0)
  return {
    cost: Math.round(cost * 10000) / 10000,
    billed: Math.round(cost * demoRate(id).markup * 100) / 100,
    calls: lines.reduce((a, l) => a + l.calls, 0),
  }
}

const demoUnbilled = new Map<string, UsageLine[]>([
  ['demo-owner', [
    { fn: 'value-cellar', calls: 19, input_tokens: 4109320, output_tokens: 30878, searches: 184, usd: 23.1586 },
    { fn: 'winery-profile', calls: 37, input_tokens: 1013913, output_tokens: 27807, searches: 52, usd: 6.2847 },
    { fn: 'read-label', calls: 15, input_tokens: 228143, output_tokens: 7298, searches: 0, usd: 1.3232 },
    { fn: 'sommelier', calls: 30, input_tokens: 169758, output_tokens: 6948, searches: 0, usd: 1.0225 },
  ]],
  ['demo-guest', [
    { fn: 'read-label', calls: 10, input_tokens: 152000, output_tokens: 4600, searches: 0, usd: 0.875 },
    { fn: 'sommelier', calls: 8, input_tokens: 96000, output_tokens: 2200, searches: 0, usd: 0.535 },
  ]],
])

const demoStatements: BillingStatement[] = []
let demoSeq = 0

const demoCredits = new Map<string, CreditEntry[]>([
  ['demo-owner', [
    { delta_usd: 25, kind: 'grant', note: 'Opening balance', created_at: '2026-07-12T09:00:00Z' },
    { delta_usd: -8.4, kind: 'usage', note: 'value-cellar', created_at: '2026-07-18T11:00:00Z' },
    { delta_usd: -4.2, kind: 'usage', note: 'winery-profile', created_at: '2026-07-20T15:00:00Z' },
  ]],
  ['demo-guest', [
    { delta_usd: 5, kind: 'grant', note: 'Welcome credit', created_at: '2026-07-02T10:00:00Z' },
    { delta_usd: -1.41, kind: 'usage', note: 'read-label', created_at: '2026-07-19T18:00:00Z' },
  ]],
])

function demoAdmin(action: string, params: Record<string, unknown>): unknown {
  const userId = String(params.userId || '')
  switch (action) {
    case 'whoami':
      return { id: 'demo-owner', email: 'owner@winesnob.app', admin: true }
    case 'overview': {
      const anthropic = { cost: 35.91, inputTokens: 5710134, outputTokens: 79731, searches: 236, calls: 119 }
      const revenueOutstanding = demoUsers.filter((u) => !demoRate(u.id).internal).reduce((a, u) => a + demoOutstanding(u.id).billed, 0)
      const revenueBilled30d = demoStatements
        .filter((s) => s.user_id && !demoRate(s.user_id).internal)
        .reduce((a, s) => a + Number(s.billed_usd ?? s.total_usd), 0)
      return {
        users: demoUsers.length,
        bottles: demoUsers.reduce((a, u) => a + u.bottles, 0),
        aiSpend30d: anthropic.cost,
        anthropic,
        revenueBilled30d: Math.round(revenueBilled30d * 100) / 100,
        revenueOutstanding: Math.round(revenueOutstanding * 100) / 100,
      } satisfies AdminOverview
    }
    case 'listUsers':
      return {
        users: demoUsers.map((u) => {
          const rate = demoRate(u.id)
          const out = demoOutstanding(u.id)
          return { ...u, markup: rate.markup, internal: rate.internal, unbilledCost: out.cost, unbilledBilled: out.billed, unbilledCalls: out.calls }
        }),
      }
    case 'usageDetail': {
      const rate = demoRate(userId)
      const lines = (demoUnbilled.get(userId) || [])
        .slice()
        .sort((a, b) => b.usd - a.usd)
        .map((l) => ({ ...l, billed: Math.round(l.usd * rate.markup * 100) / 100 }))
      const total = lines.reduce((a, l) => a + l.usd, 0)
      const calls = lines.reduce((a, l) => a + l.calls, 0)
      const balance = (demoCredits.get(userId) || []).reduce((a, e) => a + e.delta_usd, 0)
      const last = demoStatements.filter((s) => s.user_id === userId)[0] || null
      return {
        outstanding: {
          totalUsd: Math.round(total * 10000) / 10000,
          billedUsd: Math.round(total * rate.markup * 100) / 100,
          calls,
          since: calls ? '2026-07-11T09:40:00Z' : null,
          until: calls ? '2026-07-25T17:20:00Z' : null,
        },
        markup: rate.markup,
        internal: rate.internal,
        balanceOnFile: Math.round(balance * 100) / 100,
        lines,
        recent: lines.slice(0, 3).map((l, i) => ({ fn: l.fn, cost_usd: Math.round((l.usd / Math.max(1, l.calls)) * 1e4) / 1e4, searches: 0, created_at: `2026-07-2${5 - i}T1${i}:0${i}:00Z`, statement_id: null })),
        lastStatement: last ? { id: last.id, seq: last.seq, period_start: last.period_start, period_end: last.period_end, total_usd: last.total_usd, billed_usd: last.billed_usd, created_at: last.created_at } : null,
      } satisfies UsageDetail
    }
    case 'settleUser': {
      const lines = demoUnbilled.get(userId) || []
      if (!lines.length) throw new Error('Nothing to settle: no unbilled usage.')
      const rate = demoRate(userId)
      const total = lines.reduce((a, l) => a + l.usd, 0)
      const billed = Math.round(total * rate.markup * 100) / 100
      const st: BillingStatement = {
        id: `demo-st-${++demoSeq}`,
        seq: demoSeq,
        user_id: userId,
        user_email: demoUsers.find((u) => u.id === userId)?.email || null,
        period_start: '2026-07-11T09:40:00Z',
        period_end: new Date().toISOString(),
        calls: lines.reduce((a, l) => a + l.calls, 0),
        input_tokens: lines.reduce((a, l) => a + l.input_tokens, 0),
        output_tokens: lines.reduce((a, l) => a + l.output_tokens, 0),
        searches: lines.reduce((a, l) => a + l.searches, 0),
        total_usd: Math.round(total * 10000) / 10000,
        markup: rate.markup,
        billed_usd: billed,
        lines: lines.slice().sort((a, b) => b.usd - a.usd).map((l) => ({ ...l, billed: Math.round(l.usd * rate.markup * 100) / 100 })),
        note: (params.note as string) || null,
        created_at: new Date().toISOString(),
      }
      demoStatements.unshift(st)
      demoUnbilled.set(userId, [])
      // The settlement is the draw (internal accounts draw nothing).
      if (!rate.internal) {
        const entries = demoCredits.get(userId) || []
        entries.push({ delta_usd: -billed, kind: 'usage', note: `WS-${String(st.seq).padStart(4, '0')}`, created_at: new Date().toISOString() })
        demoCredits.set(userId, entries)
      }
      return { statement: st }
    }
    case 'setBillingConfig': {
      const cur = demoCfg.get(userId) || { markup: 1.5, internal: false }
      demoCfg.set(userId, {
        markup: params.markup !== undefined ? Number(params.markup) : cur.markup,
        internal: params.internal !== undefined ? !!params.internal : cur.internal,
      })
      return { ok: true }
    }
    case 'listStatements':
      return { statements: userId ? demoStatements.filter((s) => s.user_id === userId) : demoStatements }
    case 'creditDetail': {
      const entries = demoCredits.get(userId) || []
      return { balance: Math.round(entries.reduce((a, e) => a + e.delta_usd, 0) * 100) / 100, entries: entries.slice().reverse() }
    }
    case 'grantCredits': {
      const amt = Number(params.amountUsd)
      const entries = demoCredits.get(userId) || []
      entries.push({ delta_usd: amt, kind: amt > 0 ? 'grant' : 'adjustment', note: (params.note as string) || null, created_at: new Date().toISOString() })
      demoCredits.set(userId, entries)
      return { ok: true, balance: Math.round(entries.reduce((a, e) => a + e.delta_usd, 0) * 100) / 100 }
    }
    case 'setEntitlement': {
      const u = demoUsers.find((x) => x.id === userId)
      if (u) u.insurance = !!params.value
      return { ok: true, insurance: !!params.value }
    }
    default:
      throw new Error('This action needs the live backend.')
  }
}
