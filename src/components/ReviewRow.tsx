import React from 'react'
import { Tag } from './Tag'

export interface ReviewRowProps {
  /** Wine name / cuvée as read. */
  name: string
  /** Producer or château. */
  producer?: string
  /** Vintage year. */
  vintage?: string | number
  /** Region or appellation. */
  region?: string
  /** How sure the AI is about this read. `low`/`medium` get flagged for review. */
  confidence?: 'high' | 'medium' | 'low'
  /** Called when the user taps to correct this entry. */
  onEdit?: () => void
  className?: string
}

/**
 * A row in the post-capture review list. High-confidence reads show a quiet
 * green "Confirmed"; anything uncertain shows a bordeaux "Review" flag so the
 * user only fixes what the AI wasn't sure about — effort scales with doubt.
 */
export function ReviewRow({
  name,
  producer,
  vintage,
  region,
  confidence = 'high',
  onEdit,
  className,
}: ReviewRowProps) {
  const cls = ['ws-review', className].filter(Boolean).join(' ')
  const sub = [producer, region].filter(Boolean).join(' · ')
  const needsReview = confidence !== 'high'
  return (
    <div className={cls}>
      <span className="ws-review__vintage">{vintage || '—'}</span>
      <div className="ws-review__main">
        <p className="ws-review__name">{name}</p>
        {sub && <p className="ws-review__sub">{sub}</p>}
      </div>
      {needsReview ? (
        <Tag tone="accent" dot>
          Review
        </Tag>
      ) : (
        <Tag tone="ready" dot>
          Confirmed
        </Tag>
      )}
      <button type="button" className="ws-review__edit" onClick={onEdit}>
        Edit
      </button>
    </div>
  )
}
