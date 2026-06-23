import React from 'react'

export interface RatingProps {
  /** Number of marks filled, 0–5. */
  value?: number
  /** Optional 100-point score shown alongside (e.g. 95). */
  score?: number
  className?: string
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      className="ws-rating__star"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'var(--ws-taupe)'}
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <path d="M12 2l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.02 6.12 20.07l1.12-6.55L2.48 8.88l6.58-.96L12 2z" />
    </svg>
  )
}

/**
 * A tasting rating — five marks in bordeaux, with an optional 100-point score
 * for the score-minded collector.
 */
export function Rating({ value = 4, score, className }: RatingProps) {
  const filled = Math.max(0, Math.min(5, Math.round(value)))
  const cls = ['ws-rating', className].filter(Boolean).join(' ')
  return (
    <span className={cls}>
      <span className="ws-rating__stars">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} filled={i < filled} />
        ))}
      </span>
      {typeof score === 'number' && <span className="ws-rating__score">{score} pts</span>}
    </span>
  )
}
