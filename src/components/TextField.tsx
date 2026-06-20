import React from 'react'

export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Field label, shown as a small uppercase caption. */
  label?: string
  /** Helper text under the field. */
  hint?: string
  /** Error message; replaces the hint and marks the field invalid. */
  error?: string
}

/**
 * A labelled text input. Pass `label`, `placeholder`, and optionally `hint`
 * or `error`. Wraps a native input, so all input attributes pass through.
 */
export function TextField({ label, hint, error, id, className, ...rest }: TextFieldProps) {
  const fieldId =
    id || (label ? `ws-field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
  const cls = ['ws-field', error ? 'ws-field--error' : '', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      {label && (
        <label className="ws-label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <input id={fieldId} className="ws-input" {...rest} />
      {(error || hint) && (
        <span className={error ? 'ws-hint ws-hint--error' : 'ws-hint'}>{error || hint}</span>
      )}
    </div>
  )
}
