import React from 'react'

export interface SegmentedOption {
  key: string
  label: string
}

export interface SegmentedControlProps {
  /** The choices. */
  options: SegmentedOption[]
  /** Selected key (defaults to the first). */
  value?: string
  /** Called when a choice is made. */
  onChange?: (key: string) => void
  className?: string
}

/**
 * A compact segmented control for mutually-exclusive choices — list vs grid,
 * wine colour, a view toggle.
 */
export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  const cls = ['ws-segmented', className].filter(Boolean).join(' ')
  const current = value ?? options[0]?.key
  return (
    <div className={cls} role="tablist">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`ws-segmented__opt${o.key === current ? ' ws-segmented__opt--active' : ''}`}
          aria-selected={o.key === current}
          onClick={() => onChange?.(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
