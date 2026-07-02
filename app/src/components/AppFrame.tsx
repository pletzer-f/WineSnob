import type { ReactNode } from 'react'
import { AppShell, AppHeader, SideNav, TabBar, Logo, Avatar, Button } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { activeCellarName } from '@/store/selectors'

const NAV_ITEMS = [
  { key: 'cellar', label: 'Cellar' },
  { key: 'stats', label: 'Stats' },
  { key: 'collections', label: 'Collections' },
  { key: 'log', label: 'Cellar log' },
  { key: 'wishlist', label: 'Wishlist' },
]

const TAB_ITEMS = [
  { key: 'cellar', label: 'Cellar' },
  { key: 'stats', label: 'Stats' },
  { key: 'add', label: 'Add' },
  { key: 'log', label: 'Log' },
  { key: 'wishlist', label: 'Wishlist' },
]

export function AppFrame({ children }: { children: ReactNode }) {
  const screen = useStore((s) => s.screen)
  const go = useStore((s) => s.go)
  const openCellarSwitch = useStore((s) => s.openCellarSwitch)
  const cellarName = useStore((s) => activeCellarName(s))
  const accountName = useStore((s) => s.account.name)

  const navActive = screen === 'detail' || screen === 'edit' ? 'cellar' : screen

  const railFooter = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)', padding: '0 4px' }}>
      <button
        onClick={() => go('notes')}
        style={{
          textAlign: 'left',
          background: 'none',
          border: 0,
          cursor: 'pointer',
          font: 'inherit',
          fontSize: 14,
          color: screen === 'notes' ? 'var(--ws-ink)' : 'var(--ws-muted)',
          padding: '8px 12px',
          borderRadius: 'var(--ws-radius-md)',
        }}
      >
        All notes
      </button>
      <button
        onClick={() => go('settings')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'none',
          border: 0,
          cursor: 'pointer',
          font: 'inherit',
          padding: '6px 8px',
          borderRadius: 'var(--ws-radius-md)',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <Avatar name={accountName} size={32} />
        <span style={{ fontSize: 13, color: 'var(--ws-muted)' }}>Your cellar</span>
      </button>
    </div>
  )

  const headerActions = (
    <>
      <button
        onClick={openCellarSwitch}
        aria-label="Switch cellar"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          background: 'var(--ws-cream)',
          border: '0.5px solid var(--ws-border)',
          borderRadius: 999,
          cursor: 'pointer',
          font: 'inherit',
          fontSize: 13,
          color: 'var(--ws-ink)',
          padding: '6px 12px',
          marginRight: 4,
          minWidth: 0,
          maxWidth: '46vw',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ws-bordeaux)', flex: 'none' }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cellarName}</span>
        <span style={{ color: 'var(--ws-muted)', fontSize: 10, flex: 'none' }}>▾</span>
      </button>
      <span className="ws-hide-mobile" style={{ display: 'inline-flex' }}>
        <Button variant="primary" size="sm" onClick={() => go('add')}>
          Add a bottle
        </Button>
      </span>
      <button
        onClick={() => go('settings')}
        aria-label="Account"
        style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, marginLeft: 12, display: 'inline-flex', flex: 'none' }}
      >
        <Avatar name={accountName} size={32} />
      </button>
    </>
  )

  return (
    <div className="ws-app-root" style={{ background: 'var(--ws-bg)', fontFamily: 'var(--ws-font-ui)', color: 'var(--ws-ink)' }}>
      <AppShell
        sidebar={<SideNav items={NAV_ITEMS} activeKey={navActive} onSelect={go} header={<Logo variant="stacked" />} footer={railFooter} />}
        tabbar={<TabBar items={TAB_ITEMS} activeKey={navActive} onSelect={go} />}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <AppHeader actions={headerActions} />
          <main
            className="ws-app-main"
            style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            {children}
          </main>
        </div>
      </AppShell>
    </div>
  )
}
