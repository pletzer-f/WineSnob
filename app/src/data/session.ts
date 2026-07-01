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

  // Supabase mode: the auth session is the source of truth. Never reveal a
  // stale local snapshot before confirming who is signed in.
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) void onSignedIn(data.session)
    else useStore.setState({ ready: true })
  })

  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    if (session) void onSignedIn(session)
    else if (event === 'SIGNED_OUT') useStore.getState().onSignedOut()
  })

  return () => sub.subscription.unsubscribe()
}

async function onSignedIn(session: Session) {
  const store = useStore.getState()
  store.onSignedIn(session.user.id, session.user.email || '')
  startRemoteSync()
  try {
    const data = await pullUserData(session.user.id)
    if (data) store.hydrate(data)
  } catch (e) {
    console.error('Failed to load cellar', e)
  } finally {
    useStore.setState({ ready: true })
  }
}
