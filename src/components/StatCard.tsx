import React from 'react'

export interface StatCardProps {
  /** Metric label, e.g. "Bottles" or "Cellar value". */
  label: string
  /** The value, preformatted (e.g. "248" or "€42,300"). */
  value: string | number
  /** Optional sub-note under the value. */
  hint?: string
  className?: string
}

/**
 * A summary metric for the cellar dashboard — bottle count, total value,
 * bottles ready to drink. Display-serif numerals over a quiet caption.
 */
export function StatCard({ label, value, hint, className }: StatCardProps) {
  const cls = ['ws-stat', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <span className="ws-stat__label">{label}</span>
      <span className="ws-stat__value">{value}</span>
      {hint && <span className="ws-stat__hint">{hint}</span>}
    </div>
  )
}
