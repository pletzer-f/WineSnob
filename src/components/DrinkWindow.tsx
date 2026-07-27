import React from 'react'

export interface DrinkWindowProps {
  /** First year the wine is worth opening. */
  from: number
  /** Last year of the drinking window. */
  to: number
  /** "Today" — defaults to the window so the marker sits in range. */
  current?: number
  /** Override the derived status. */
  status?: 'cellaring' | 'ready' | 'past'
  className?: string
}

/**
 * The drink-window meter — when a bottle is at its best, with a marker for
 * today. Green when it's ready, taupe while cellaring, muted once past peak.
 * Reads at a glance on a BottleCard or detail view.
 */
export function DrinkWindow({ from, to, current, status, className }: DrinkWindowProps) {
  // "Today" is the real year unless the caller says otherwise; a wine ten
  // years past its window must read as past, with the marker pinned at the
  // end of the track, never floating mid-window.
  const now = current ?? new Date().getFullYear()
  const derived: NonNullable<DrinkWindowProps['status']> =
    status ?? (now < from ? 'cellaring' : now > to ? 'past' : 'ready')

  const lo = from - 1
  const hi = to + 1
  const span = hi - lo || 1
  const pct = (year: number) => Math.max(0, Math.min(100, ((year - lo) / span) * 100))

  const cls = ['ws-window', `ws-window--${derived}`, className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <span className="ws-window__label">Drink window</span>
      <div className="ws-window__track">
        <span
          className="ws-window__range"
          style={{ left: `${pct(from)}%`, width: `${pct(to) - pct(from)}%` }}
        />
        <span className="ws-window__now" style={{ left: `${pct(now)}%` }} />
      </div>
      <div className="ws-window__scale">
        <span>{from}</span>
        <span>{to}</span>
      </div>
    </div>
  )
}
