import React from 'react'

export interface ToastProps {
  /** The message. */
  message: string
  /** Visual tone. */
  tone?: 'default' | 'success' | 'error'
  /** Optional inline action label (e.g. "Undo"). */
  actionLabel?: string
  /** Called when the action is pressed. */
  onAction?: () => void
  className?: string
}

/**
 * A brief, low-key confirmation — an ink pill with a status dot, in the
 * WineSnob voice ("Added to the cellar."). The app handles its placement.
 */
export function Toast({ message, tone = 'default', actionLabel, onAction, className }: ToastProps) {
  const cls = ['ws-toast', tone !== 'default' ? `ws-toast--${tone}` : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} role="status">
      <span className="ws-toast__dot" />
      <span className="ws-toast__msg">{message}</span>
      {actionLabel && (
        <button type="button" className="ws-toast__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
