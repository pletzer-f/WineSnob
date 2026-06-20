import React from 'react'
import { Logo } from './Logo'

export interface AppHeaderProps {
  /** Right-aligned actions (buttons, etc.). */
  actions?: React.ReactNode
  className?: string
}

/**
 * The app top bar — the horizontal WineSnob logo on the left, actions on the
 * right, over a hairline divider.
 */
export function AppHeader({ actions, className }: AppHeaderProps) {
  const cls = ['ws-header', className].filter(Boolean).join(' ')
  return (
    <header className={cls}>
      <Logo variant="horizontal" />
      {actions && <div className="ws-header__actions">{actions}</div>}
    </header>
  )
}
