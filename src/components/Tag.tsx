import React from 'react'

export interface TagProps {
  /** Tone. `ready` = racing-green "ready to drink"; `accent` = bordeaux; `cellar`/`neutral` = quiet. */
  tone?: 'neutral' | 'ready' | 'cellar' | 'accent'
  /** Show a leading status dot. */
  dot?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * A small status or metadata pill — region, vintage, or a drink-window
 * signal. Use `tone="ready"` (racing green) for bottles in their window.
 */
export function Tag({ tone = 'neutral', dot = false, children, className }: TagProps) {
  const cls = ['ws-tag', tone !== 'neutral' ? `ws-tag--${tone}` : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <span className={cls}>
      {dot && <span className="ws-tag__dot" />}
      {children}
    </span>
  )
}
