import React from 'react'

export interface ModalProps {
  /** Whether the modal is shown. */
  open?: boolean
  /** Heading. */
  title?: string
  /** Body content. */
  children?: React.ReactNode
  /** Footer actions (e.g. Buttons). */
  footer?: React.ReactNode
  /** Called when the scrim or close button is activated. */
  onClose?: () => void
  className?: string
}

/**
 * An overlay dialog for edits and confirmations — a centred panel over a soft
 * ink scrim. On mobile it reads as a sheet; on desktop, a centred card.
 */
export function Modal({ open = true, title, children, footer, onClose, className }: ModalProps) {
  if (!open) return null
  const cls = ['ws-modal', className].filter(Boolean).join(' ')
  return (
    <div className="ws-modal__scrim" onClick={onClose}>
      <div className={cls} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="ws-modal__header">
            <h2 className="ws-modal__title">{title}</h2>
            <button type="button" className="ws-modal__close" aria-label="Close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        )}
        {children && <div className="ws-modal__body">{children}</div>}
        {footer && <div className="ws-modal__footer">{footer}</div>}
      </div>
    </div>
  )
}
