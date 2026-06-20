import React from 'react'

export interface SelectOption {
  label: string
  value: string
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Field label, shown as a small uppercase caption. */
  label?: string
  /** Options to choose from. */
  options: SelectOption[]
  /** Placeholder shown as a disabled first option. */
  placeholder?: string
  /** Helper text under the field. */
  hint?: string
}

/**
 * A labelled dropdown for structured fields like region or varietal.
 * Pass `label`, `options`, and optionally a `placeholder` and `hint`.
 */
export function Select({
  label,
  options,
  placeholder,
  hint,
  id,
  className,
  ...rest
}: SelectProps) {
  const fieldId =
    id || (label ? `ws-select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
  const cls = ['ws-field', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      {label && (
        <label className="ws-label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <select id={fieldId} className="ws-selectctl" {...rest}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="ws-hint">{hint}</span>}
    </div>
  )
}
