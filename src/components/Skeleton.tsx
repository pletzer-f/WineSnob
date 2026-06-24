import React from 'react'

export interface SkeletonProps {
  /** CSS width, e.g. "100%" or 120. */
  width?: number | string
  /** CSS height, e.g. 16. */
  height?: number | string
  /** Fully round it — for avatar placeholders. */
  circle?: boolean
  className?: string
}

/**
 * A pulsing placeholder for content that's still loading. Stack a few to
 * stand in for a bottle card or a row while the cellar fetches.
 */
export function Skeleton({ width = '100%', height = 16, circle = false, className }: SkeletonProps) {
  const cls = ['ws-skeleton', className].filter(Boolean).join(' ')
  return <span className={cls} style={{ width, height, borderRadius: circle ? '999px' : undefined }} />
}
