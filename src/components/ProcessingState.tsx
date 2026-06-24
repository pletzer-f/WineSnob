import React from 'react'
import { Spinner } from './Spinner'

export interface ProcessingStateProps {
  /** How many done so far. */
  current?: number
  /** Total to process. */
  total?: number
  /** Headline message. */
  message?: string
  className?: string
}

/**
 * The "AI is reading your labels" state — a spinner, a count, and a progress
 * bar while the captured bottles are identified.
 */
export function ProcessingState({
  current = 0,
  total = 0,
  message = 'Reading your labels…',
  className,
}: ProcessingStateProps) {
  const cls = ['ws-processing', className].filter(Boolean).join(' ')
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className={cls}>
      <Spinner size={28} />
      <div>
        <p className="ws-processing__msg" style={{ margin: 0 }}>
          {message}
        </p>
        {total > 0 && (
          <p className="ws-processing__sub" style={{ margin: '4px 0 0' }}>
            {current} of {total} identified
          </p>
        )}
      </div>
      {total > 0 && (
        <div className="ws-processing__bar">
          <span className="ws-processing__fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
