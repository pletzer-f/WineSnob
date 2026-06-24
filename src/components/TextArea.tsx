import React from 'react'

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Field label. */
  label?: string
  /** Helper text under the field. */
  hint?: string
}

/**
 * A multi-line field for tasting notes and longer text. Wraps a native
 * textarea, so all textarea attributes pass through.
 */
export function TextArea({ label, hint, id, className, ...rest }: TextAreaProps) {
  const fieldId = id || (label ? `ws-ta-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
  const cls = ['ws-field', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      {label && (
        <label className="ws-label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <textarea id={fieldId} className="ws-textarea" {...rest} />
      {hint && <span className="ws-hint">{hint}</span>}
    </div>
  )
}
