// WineSnob — usage credits, the user's side. The balance comes from the
// credit_balances view (RLS shows a signed-in user only their own row).
// Denominated in USD at raw cost; the admin grants top-ups manually.

import { hasSupabase, supabase } from '@/lib/supabase'

/** Rough cost of pricing one wine against live listings (calibrated from
 * real usage). Used to translate a balance into "N bottle valuations". */
export const VALUATION_COST_USD = 0.28
/** Rough cost of one sommelier exchange. */
export const SOMMELIER_COST_USD = 0.07
/** Below this balance, new AI work is paused server-side. */
export const CREDIT_FLOOR_USD = -10

/** The signed-in user's credit balance, or null when it cannot be read
 * (demo mode returns a sample balance so the UI is explorable). */
export async function fetchCreditBalance(): Promise<number | null> {
  if (!hasSupabase) return 12.4
  try {
    const { data, error } = await supabase.from('credit_balances').select('balance_usd').maybeSingle()
    if (error) return null
    const row = data as { balance_usd?: number } | null
    return row ? Number(row.balance_usd ?? 0) : 0
  } catch {
    return null
  }
}
