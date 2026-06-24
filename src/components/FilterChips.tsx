import React from 'react'

export interface FilterChip {
  key: string
  label: string
}

export interface FilterChipsProps {
  /** The available filters. */
  options: FilterChip[]
  /** Selected keys (multi-select). */
  selected?: string[]
  /** Called when a chip is toggled. */
  onToggle?: (key: string) => void
  className?: string
}

/**
 * A row of toggleable filter chips — colour, region, drink status. Multi-select;
 * the active chip fills with ink.
 */
export function FilterChips({ options, selected = [], onToggle, className }: FilterChipsProps) {
  const cls = ['ws-chips', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      {options.map((o) => {
        const active = selected.includes(o.key)
        return (
          <button
            key={o.key}
            type="button"
            className={`ws-chip${active ? ' ws-chip--active' : ''}`}
            aria-pressed={active}
            onClick={() => onToggle?.(o.key)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
