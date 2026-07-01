import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when the app is pointed at a real Supabase project. */
export const hasSupabase = Boolean(url && anon)

// createClient throws on empty credentials, so fall back to a harmless
// placeholder when unconfigured. Real calls are gated on `hasSupabase`, and
// the app runs in local demo mode until env vars are set.
export const supabase = createClient<Database>(
  url || 'https://placeholder.supabase.co',
  anon || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
