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
}

export interface AdminOverview {
  users: number
  bottles: number
  aiSpend30d: number
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
}

export interface UsageDetail {
  outstanding: { totalUsd: number; calls: number; since: string | null; until: string | null }
  lines: UsageLine[]
  recent: { fn: string; cost_usd: number; searches: number; created_at: string; statement_id: string | null }[]
  lastStatement: { id: string; seq: number; period_start: string | null; period_end: string; total_usd: number; created_at: string } | null
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
  lines: UsageLine[]
  note: string | null
  created_at: string
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
  { id: 'demo-owner', email: 'owner@winesnob.app', name: 'The Owner', createdAt: '2026-06-02', lastSignIn: '2026-07-25', confirmed: true, onboarded: true, currency: 'EUR', bottles: 82, cellarValue: 34738, drinks: 7, wishes: 5, aiCost30d: 31.79, aiCalls30d: 101, isAdmin: true },
  { id: 'demo-guest', email: 'guest@winesnob.app', name: 'A Guest', createdAt: '2026-07-01', lastSignIn: '2026-07-20', confirmed: true, onboarded: true, currency: 'EUR', bottles: 24, cellarValue: 6120, drinks: 2, wishes: 1, aiCost30d: 4.12, aiCalls30d: 18, isAdmin: false },
]

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

function demoAdmin(action: string, params: Record<string, unknown>): unknown {
  const userId = String(params.userId || '')
  switch (action) {
    case 'whoami':
      return { id: 'demo-owner', email: 'owner@winesnob.app', admin: true }
    case 'overview':
      return { users: demoUsers.length, bottles: demoUsers.reduce((a, u) => a + u.bottles, 0), aiSpend30d: 35.91 }
    case 'listUsers':
      return { users: demoUsers }
    case 'usageDetail': {
      const lines = (demoUnbilled.get(userId) || []).slice().sort((a, b) => b.usd - a.usd)
      const total = lines.reduce((a, l) => a + l.usd, 0)
      const calls = lines.reduce((a, l) => a + l.calls, 0)
      const last = demoStatements.filter((s) => s.user_id === userId)[0] || null
      return {
        outstanding: { totalUsd: Math.round(total * 10000) / 10000, calls, since: calls ? '2026-07-11T09:40:00Z' : null, until: calls ? '2026-07-25T17:20:00Z' : null },
        lines,
        recent: lines.slice(0, 3).map((l, i) => ({ fn: l.fn, cost_usd: Math.round((l.usd / Math.max(1, l.calls)) * 1e4) / 1e4, searches: 0, created_at: `2026-07-2${5 - i}T1${i}:0${i}:00Z`, statement_id: null })),
        lastStatement: last ? { id: last.id, seq: last.seq, period_start: last.period_start, period_end: last.period_end, total_usd: last.total_usd, created_at: last.created_at } : null,
      } satisfies UsageDetail
    }
    case 'settleUser': {
      const lines = demoUnbilled.get(userId) || []
      if (!lines.length) throw new Error('Nothing to settle: no unbilled usage.')
      const total = lines.reduce((a, l) => a + l.usd, 0)
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
        lines: lines.slice().sort((a, b) => b.usd - a.usd),
        note: (params.note as string) || null,
        created_at: new Date().toISOString(),
      }
      demoStatements.unshift(st)
      demoUnbilled.set(userId, [])
      return { statement: st }
    }
    case 'listStatements':
      return { statements: userId ? demoStatements.filter((s) => s.user_id === userId) : demoStatements }
    default:
      throw new Error('This action needs the live backend.')
  }
}
