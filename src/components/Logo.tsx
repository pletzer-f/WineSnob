import React from 'react'

export interface LogoProps {
  /** Lockup form. `stacked` is the primary logo; `horizontal` for tight bands; `icon` is the WS app mark. */
  variant?: 'stacked' | 'horizontal' | 'icon'
  /** For the icon variant, use the quiet alabaster treatment instead of bordeaux. */
  quiet?: boolean
  className?: string
}

/**
 * The WineSnob wordmark — letterspaced Spectral, ink on alabaster, no flourish.
 * `stacked` is the primary lockup, `horizontal` fits narrow or wide bands, and
 * `icon` renders the WS app mark (bordeaux by default, alabaster when `quiet`).
 */
export function Logo({ variant = 'stacked', quiet = false, className }: LogoProps) {
  const cls = ['ws-logo', `ws-logo--${variant}`, quiet ? 'ws-logo--quiet' : '', className]
    .filter(Boolean)
    .join(' ')
  if (variant === 'icon') {
    return (
      <span className={cls} aria-label="WineSnob">
        <span className="ws-logo__mark">WS</span>
      </span>
    )
  }
  return (
    <span className={cls} aria-label="WineSnob">
      <span className="ws-logo__line">WINE</span>
      <span className="ws-logo__line">SNOB</span>
    </span>
  )
}
