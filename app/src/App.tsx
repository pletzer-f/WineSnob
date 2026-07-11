import { useEffect, useState } from 'react'
import { useStore, type Screen } from '@/store/store'
import { bootstrapSession } from '@/data/session'
import { signLabelUrls, isInlinePhoto } from '@/data/labels'
import { hasSupabase } from '@/lib/supabase'
import { isStandalone } from '@/lib/pwa'
import { Landing } from '@/screens/Landing'
import { AppFrame } from '@/components/AppFrame'
import { Toaster } from '@/components/Toaster'
import { Modals } from '@/modals/Modals'
import { Sommelier } from '@/components/Sommelier'
import { Admin } from '@/screens/Admin'
import { ResetPassword } from '@/screens/ResetPassword'
import { Onboarding } from '@/screens/Onboarding'
import { Cellar } from '@/screens/Cellar'
import { BottleDetailScreen } from '@/screens/BottleDetail'
import { AddBottle } from '@/screens/AddBottle'
import { EditBottle } from '@/screens/EditBottle'
import { Stats } from '@/screens/Stats'
import { Collections } from '@/screens/Collections'
import { Wishlist } from '@/screens/Wishlist'
import { CellarLog } from '@/screens/CellarLog'
import { Notes } from '@/screens/Notes'
import { Settings } from '@/screens/Settings'

function ScreenView({ screen }: { screen: Screen }) {
  switch (screen) {
    case 'detail':
      return <BottleDetailScreen />
    case 'add':
      return <AddBottle />
    case 'edit':
      return <EditBottle />
    case 'stats':
      return <Stats />
    case 'collections':
      return <Collections />
    case 'wishlist':
      return <Wishlist />
    case 'log':
      return <CellarLog />
    case 'notes':
      return <Notes />
    case 'settings':
      return <Settings />
    case 'cellar':
    default:
      return <Cellar />
  }
}

export function App() {
  const ready = useStore((s) => s.ready)
  const onboarded = useStore((s) => s.onboarded)
  const userId = useStore((s) => s.userId)
  const screen = useStore((s) => s.screen)
  const adminOpen = useStore((s) => s.adminOpen)
  const pwRecovery = useStore((s) => s.pwRecovery)

  // The front-door decision is made ONCE per visit, when the session first
  // resolves: browser visitors without an account get the landing journey and
  // keep it through sign-up until they choose to enter; installed launches and
  // already-signed-in reloads go straight in.
  const [showLanding, setShowLanding] = useState<boolean | null>(null)

  useEffect(() => bootstrapSession(), [])

  // Auto-valuation: once the cellar is loaded, quietly refresh bottles whose
  // market price has gone stale against the cadence in Settings.
  useEffect(() => {
    if (!ready || !onboarded || !userId || !hasSupabase) return
    const t = setTimeout(() => {
      const st = useStore.getState()
      st.recordSnapshot()
      if (st.settings.autoValue && st.bottles.length) void st.refreshValuations(false)
    }, 4000)
    return () => clearTimeout(t)
  }, [ready, onboarded, userId])

  useEffect(() => {
    if (ready && showLanding === null) {
      setShowLanding(!onboarded && !userId && !isStandalone())
    }
  }, [ready, onboarded, userId, showLanding])

  // Label photographs live behind signed URLs; mint them for any stored
  // photo that does not have a display URL yet (initial load, new uploads
  // land their own URLs directly).
  const photoKey = useStore((s) =>
    s.bottles
      .filter((b) => b.photo && !isInlinePhoto(b.photo))
      .map((b) => b.photo)
      .sort()
      .join('|'),
  )
  useEffect(() => {
    if (!ready || !userId || !hasSupabase || !photoKey) return
    const st = useStore.getState()
    const missing = [...new Set(photoKey.split('|'))].filter((p) => p && !st.labelUrls[p])
    if (!missing.length) return
    void signLabelUrls(missing).then((map) => useStore.getState().mergeLabelUrls(map))
  }, [ready, userId, photoKey])

  if (!ready || showLanding === null) return null

  if (showLanding) {
    return (
      <>
        <Landing onDone={() => setShowLanding(false)} />
        {adminOpen && <Admin />}
        {pwRecovery && <ResetPassword />}
        <Toaster />
      </>
    )
  }

  if (!onboarded)
    return (
      <>
        <Onboarding />
        {adminOpen && <Admin />}
        {pwRecovery && <ResetPassword />}
        <Toaster />
      </>
    )

  return (
    <>
      <AppFrame>
        <div key={screen} className="ws-screen-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ScreenView screen={screen} />
        </div>
      </AppFrame>
      <Modals />
      <Sommelier />
      {adminOpen && <Admin />}
      {pwRecovery && <ResetPassword />}
      <Toaster />
    </>
  )
}
