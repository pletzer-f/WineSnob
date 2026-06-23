import React from 'react'

export interface TabBarItem {
  key: string
  label: string
}

export interface TabBarProps {
  /** Navigation destinations, e.g. Cellar / Add / Stats. */
  items: TabBarItem[]
  /** The currently selected key (defaults to the first item). */
  activeKey?: string
  /** Called when a tab is selected. */
  onSelect?: (key: string) => void
  className?: string
}

/**
 * The app's bottom navigation. The active destination is marked in ink with a
 * small bordeaux indicator; the rest stay quiet.
 */
export function TabBar({ items, activeKey, onSelect, className }: TabBarProps) {
  const cls = ['ws-tabbar', className].filter(Boolean).join(' ')
  const current = activeKey ?? items[0]?.key
  return (
    <nav className={cls}>
      {items.map((it) => {
        const isActive = it.key === current
        return (
          <button
            key={it.key}
            type="button"
            className={`ws-tab${isActive ? ' ws-tab--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelect?.(it.key)}
          >
            {isActive && <span className="ws-tab__dot" />}
            <span className="ws-tab__label">{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
