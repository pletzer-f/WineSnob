import { useEffect } from 'react'
import { useStore, type Screen } from '@/store/store'
import { bootstrapSession } from '@/data/session'
import { AppFrame } from '@/components/AppFrame'
import { Toaster } from '@/components/Toaster'
import { Modals } from '@/modals/Modals'
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
  const screen = useStore((s) => s.screen)

  useEffect(() => bootstrapSession(), [])

  if (!ready) return null

  if (!onboarded) return <Onboarding />

  return (
    <>
      <AppFrame>
        <ScreenView screen={screen} />
      </AppFrame>
      <Modals />
      <Toaster />
    </>
  )
}
