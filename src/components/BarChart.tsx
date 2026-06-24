import React from 'react'

export interface BarDatum {
  label: string
  value: number
  /** Display string for the value (e.g. "€12,400"); defaults to the number. */
  display?: string
}

export interface BarChartProps {
  /** The rows. */
  data: BarDatum[]
  /** Max for scaling; defaults to the largest value. */
  max?: number
  className?: string
}

/**
 * A horizontal bar breakdown — bottles or value by region, colour, or vintage.
 * Quiet bordeaux bars on a stone track.
 */
export function BarChart({ data, max, className }: BarChartProps) {
  const cls = ['ws-barchart', className].filter(Boolean).join(' ')
  const top = max ?? Math.max(1, ...data.map((d) => d.value))
  return (
    <div className={cls}>
      {data.map((d, i) => (
        <div className="ws-barchart__row" key={i}>
          <span className="ws-barchart__label">{d.label}</span>
          <span className="ws-barchart__track">
            <span
              className="ws-barchart__fill"
              style={{ width: `${Math.round((d.value / top) * 100)}%` }}
            />
          </span>
          <span className="ws-barchart__value">{d.display ?? d.value}</span>
        </div>
      ))}
    </div>
  )
}
