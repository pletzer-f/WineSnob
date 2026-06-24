import React from 'react'

export interface SideNavItem {
  key: string
  label: string
  /** Optional leading icon (e.g. an inline SVG). */
  icon?: React.ReactNode
}

export interface SideNavProps {
  /** Navigation destinations. */
  items: SideNavItem[]
  /** Currently selected key (defaults to the first item). */
  activeKey?: string
  /** Called when a destination is chosen. */
  onSelect?: (key: string) => void
  /** Top slot — usually the Logo. */
  header?: React.ReactNode
  /** Bottom slot — usually the account / avatar. */
  footer?: React.ReactNode
  className?: string
}

/**
 * The desktop navigation rail: brand at the top, destinations in the middle,
 * account at the foot. Pairs with TabBar (mobile) inside an AppShell.
 */
export function SideNav({ items, activeKey, onSelect, header, footer, className }: SideNavProps) {
  const cls = ['ws-sidenav', className].filter(Boolean).join(' ')
  const current = activeKey ?? items[0]?.key
  return (
    <nav className={cls}>
      {header && <div className="ws-sidenav__brand">{header}</div>}
      <div className="ws-sidenav__items">
        {items.map((it) => {
          const isActive = it.key === current
          return (
            <button
              key={it.key}
              type="button"
              className={`ws-sidenav__item${isActive ? ' ws-sidenav__item--active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelect?.(it.key)}
            >
              {it.icon && <span className="ws-sidenav__icon">{it.icon}</span>}
              <span>{it.label}</span>
            </button>
          )
        })}
      </div>
      {footer && <div className="ws-sidenav__footer">{footer}</div>}
    </nav>
  )
}
