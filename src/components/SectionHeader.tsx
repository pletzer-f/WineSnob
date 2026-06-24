import React from 'react'

export interface SectionHeaderProps {
  /** Section title. */
  title: string
  /** Optional count shown after the title (e.g. 248). */
  count?: number | string
  /** Right-aligned slot — a SegmentedControl, sort menu, or action. */
  action?: React.ReactNode
  className?: string
}

/**
 * A screen or list section heading: serif title, an optional count, and a
 * right-aligned action slot.
 */
export function SectionHeader({ title, count, action, className }: SectionHeaderProps) {
  const cls = ['ws-section', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <div className="ws-section__head">
        <h2 className="ws-section__title">{title}</h2>
        {count != null && <span className="ws-section__count">{count}</span>}
      </div>
      {action && <div className="ws-section__action">{action}</div>}
    </div>
  )
}
