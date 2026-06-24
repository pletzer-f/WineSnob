import React from 'react'

export interface SpinnerProps {
  /** Diameter in px. */
  size?: number
  /** Accessible label. */
  label?: string
  className?: string
}

/**
 * A quiet loading indicator in bordeaux — for the moment the AI is reading a
 * label, or a screen is fetching.
 */
export function Spinner({ size = 22, label = 'Loading', className }: SpinnerProps) {
  const cls = ['ws-spinner', className].filter(Boolean).join(' ')
  return (
    <span className={cls} role="status" aria-label={label}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="var(--ws-stone)" strokeWidth="2.5" />
        <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}
