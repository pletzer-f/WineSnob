import { useEffect, useState } from 'react'
import { useStore, type Screen } from '@/store/store'
import { bootstrapSession } from '@/data/session'
import { hasSupabase } from '@/lib/supabase'
import { isStandalone } from '@/lib/pwa'
import { Landing } from '@/screens/Landing'
import { AppFrame } from '@/components/AppFrame'
import { Toaster } from '@/components/Toaster'
import { Modals } from '@/modals/Modals'
import { Sommelier } from '@/components/Sommelier'
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
  const [continueWeb, setContinueWeb] = useState(false)

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

  if (!ready) return null

  // Public front door: a browser visitor who isn't signed in sees the install
  // landing first. Installed (standalone) launches and signed-in users skip it.
  if (!onboarded && !userId && !continueWeb && !isStandalone()) {
    return <Landing onContinue={() => setContinueWeb(true)} />
  }

  if (!onboarded) return <Onboarding />

  return (
    <>
      <AppFrame>
        <div key={screen} className="ws-screen-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ScreenView screen={screen} />
        </div>
      </AppFrame>
      <Modals />
      <Sommelier />
      <Toaster />
    </>
  )
}
