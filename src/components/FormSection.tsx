import React from 'react'

export interface FormSectionProps {
  /** Section caption (e.g. "Provenance"). */
  title?: string
  children?: React.ReactNode
  className?: string
}

/**
 * Groups related form fields under a quiet caption — Identity, Provenance,
 * Tasting. Stack these to build the add / edit form.
 */
export function FormSection({ title, children, className }: FormSectionProps) {
  const cls = ['ws-formsection', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      {title && <div className="ws-formsection__title">{title}</div>}
      <div className="ws-formsection__body">{children}</div>
    </div>
  )
}
