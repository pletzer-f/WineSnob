// WineSnob — usage credits, the user's side. Since the commerce switch the
// balance is drawn at SETTLEMENT: money on file only moves when a payment is
// recorded or a statement locks, and this period's usage accrues as
// outstanding at the account's billed rate. credit_balances answers
// "available" (money on file minus outstanding), which is also what the
// server-side floor pauses on; my_billing carries the full picture.

import { hasSupabase, supabase } from '@/lib/supabase'

/** Rough COST of pricing one wine against live listings (calibrated from
 * real usage). Customer-facing quotes multiply by their markup. */
export const VALUATION_COST_USD = 0.28
/** Rough cost of one sommelier exchange. */
export const SOMMELIER_COST_USD = 0.07
/** Below this AVAILABLE balance, new AI work is paused server-side. */
export const CREDIT_FLOOR_USD = -10

/** The signed-in user's AVAILABLE credit (money on file minus this period's
 * usage at their rate), or null when it cannot be read. */
export async function fetchCreditBalance(): Promise<number | null> {
  if (!hasSupabase) return 10.54
  try {
    const { data, error } = await supabase.from('credit_balances').select('balance_usd').maybeSingle()
    if (error) return null
    const row = data as { balance_usd?: number } | null
    return row ? Number(row.balance_usd ?? 0) : 0
  } catch {
    return null
  }
}

export interface MyBilling {
  /** Money paid in minus settled statements. */
  balance: number
  /** This period's usage at the account's billed rate. */
  outstanding: number
  /** balance minus outstanding: what is left to spend. */
  available: number
  /** The account's rate; feature prices quote at cost x this. */
  markup: number
}

/** The customer's own commercial picture, from the my_billing view. */
export async function fetchMyBilling(): Promise<MyBilling | null> {
  if (!hasSupabase) return { balance: 12.4, outstanding: 1.86, available: 10.54, markup: 1.5 }
  try {
    const { data, error } = await supabase.from('my_billing').select('*').maybeSingle()
    if (error || !data) return null
    const r = data as { balance_usd?: number; outstanding_usd?: number; available_usd?: number; markup?: number }
    return {
      balance: Number(r.balance_usd ?? 0),
      outstanding: Number(r.outstanding_usd ?? 0),
      available: Number(r.available_usd ?? 0),
      markup: Number(r.markup ?? 1.5),
    }
  } catch {
    return null
  }
}
