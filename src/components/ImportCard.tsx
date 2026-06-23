import React from 'react'

export interface ImportCardProps {
  /** What this source is, e.g. "From a spreadsheet". */
  title: string
  /** Supporting line, e.g. "CSV, Excel, or a CellarTracker export". */
  hint?: string
  /** Short format chip, e.g. "CSV" or "PDF". */
  badge?: string
  /** Called when the source is chosen. */
  onClick?: () => void
  className?: string
}

/**
 * An entry point for bulk import — a spreadsheet, a PDF merchant list, a
 * CellarTracker export. Stack a few of these on the import screen so the user
 * loads an existing cellar in one action instead of bottle-by-bottle.
 */
export function ImportCard({ title, hint, badge, onClick, className }: ImportCardProps) {
  const cls = ['ws-import', className].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} onClick={onClick}>
      {badge && <span className="ws-import__badge">{badge}</span>}
      <span className="ws-import__body">
        <span className="ws-import__title">{title}</span>
        {hint && <span className="ws-import__hint">{hint}</span>}
      </span>
      <span className="ws-import__chev" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </span>
    </button>
  )
}
