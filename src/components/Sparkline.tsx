import React from 'react'

export interface SparklineProps {
  /** The series of values, in order. */
  points: number[]
  width?: number
  height?: number
  className?: string
}

/**
 * A compact trend line — cellar value over time — drawn in bordeaux with a
 * dot on the latest point.
 */
export function Sparkline({ points, width = 240, height = 56, className }: SparklineProps) {
  const cls = ['ws-sparkline', className].filter(Boolean).join(' ')
  const lo = Math.min(...points)
  const hi = Math.max(...points)
  const span = hi - lo || 1
  const pad = 4
  const w = width - pad * 2
  const h = height - pad * 2
  const coords = points.map((p, i) => {
    const x = pad + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w)
    const y = pad + h - ((p - lo) / span) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const last = coords[coords.length - 1]?.split(',')
  return (
    <svg
      className={cls}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      role="img"
      aria-label="Trend"
    >
      <polyline
        points={coords.join(' ')}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" />}
    </svg>
  )
}
