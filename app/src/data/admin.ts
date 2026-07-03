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

/** Call the admin edge function. All actions are gated server-side on
 * admin_users membership; this client never sees privileged keys. */
export async function adminCall<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  if (!hasSupabase) throw new Error('The admin console needs the live backend.')
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
