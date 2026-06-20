import React from 'react'

export interface EmptyStateProps {
  /** Headline — defaults to the WineSnob dry-wit empty-cellar line. */
  title?: string
  /** Supporting line. */
  message?: string
  /** Optional action (e.g. a Button). */
  action?: React.ReactNode
  className?: string
}

/**
 * The empty-cellar state, in the WineSnob voice. Defaults to dry wit
 * ("Nothing to declare. Yet."); pass `action` to add a primary button.
 */
export function EmptyState({
  title = 'Nothing to declare. Yet.',
  message = 'Your cellar is waiting. Add your first bottle and we’ll keep its counsel.',
  action,
  className,
}: EmptyStateProps) {
  const cls = ['ws-empty', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <h2 className="ws-empty__title">{title}</h2>
      <p className="ws-empty__message">{message}</p>
      {action && <div className="ws-empty__action">{action}</div>}
    </div>
  )
}
