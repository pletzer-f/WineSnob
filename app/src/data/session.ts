import type { Session } from '@supabase/supabase-js'
import { hasSupabase, supabase } from '@/lib/supabase'
import { useStore } from '@/store/store'
import { loadLocalSnapshot } from './sync'
import { pullUserData, startRemoteSync } from './repo'

/**
 * Boot the app's session. Hydrates any local snapshot immediately, then — when
 * Supabase is configured — subscribes to auth and loads the signed-in user's
 * cloud data. Returns an unsubscribe function.
 */
// Guards against re-loading (and re-launching onboarding) on repeat auth events
// such as token refreshes, which fire with the same user.
let loadedUserId: string | null = null

export function bootstrapSession(): () => void {
  const store = useStore.getState()

  // Demo mode (no Supabase configured): the local snapshot is the source of
  // truth so the app is fully explorable offline.
  if (!hasSupabase) {
    const snap = loadLocalSnapshot()
    if (snap) store.hydrate(snap)
    else useStore.setState({ ready: true })
    return () => {}
  }

  // Supabase mode: the auth session is the source of truth. INITIAL_SESSION
  // (fired on subscribe) covers page reloads; SIGNED_IN covers fresh logins.
  // Other events (token refresh, user update) must NOT re-run the loader.
  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      loadedUserId = null
      useStore.getState().onSignedOut()
      return
    }
    if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      void onSignedIn(session)
    } else if (event === 'INITIAL_SESSION' && !session) {
      useStore.setState({ ready: true })
    }
  })

  return () => sub.subscription.unsubscribe()
}

async function onSignedIn(session: Session) {
  if (session.user.id === loadedUserId) return
  loadedUserId = session.user.id

  const store = useStore.getState()
  store.onSignedIn(session.user.id, session.user.email || '')
  startRemoteSync()
  try {
    const data = await pullUserData(session.user.id)
    if (data) {
      store.hydrate(data)
      // First real login (or an account that never finished onboarding):
      // run the welcome intro. finishOnboarding flips onboarded → true and
      // persists it, so later logins land straight in the app.
      if (!data.onboarded) useStore.setState({ obStep: 'welcome' })
    } else {
      // No profile row yet — treat as a brand-new user.
      useStore.setState({ onboarded: false, obStep: 'welcome' })
    }
  } catch (e) {
    console.error('Failed to load your cellar', e)
  } finally {
    useStore.setState({ ready: true })
  }
}
