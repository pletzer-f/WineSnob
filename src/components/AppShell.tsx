import React from 'react'

export interface AppShellProps {
  /** Desktop side rail (e.g. SideNav) — hidden on mobile. */
  sidebar?: React.ReactNode
  /** Mobile bottom navigation (e.g. TabBar) — hidden on desktop. */
  tabbar?: React.ReactNode
  /** The screen content. */
  children?: React.ReactNode
  className?: string
}

/**
 * The responsive app frame: a side rail on desktop, bottom tabs on mobile,
 * with the screen content between. Drop a SideNav into `sidebar` and a TabBar
 * into `tabbar` and the right one shows at each size.
 */
export function AppShell({ sidebar, tabbar, children, className }: AppShellProps) {
  const cls = ['ws-shell', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      {sidebar && <aside className="ws-shell__sidebar">{sidebar}</aside>}
      <div className="ws-shell__main">
        <div className="ws-shell__content">{children}</div>
        {tabbar && <div className="ws-shell__tabbar">{tabbar}</div>}
      </div>
    </div>
  )
}
