import React from 'react'

export interface SwitchProps {
  /** Controlled on/off state. */
  checked?: boolean
  /** Uncontrolled initial state. */
  defaultChecked?: boolean
  /** Called with the new state. */
  onChange?: (checked: boolean) => void
  /** Accessible label. */
  label?: string
  disabled?: boolean
  className?: string
}

/**
 * A toggle for on/off settings — racing green when on.
 */
export function Switch({ checked, defaultChecked, onChange, label, disabled, className }: SwitchProps) {
  const cls = ['ws-switch', className].filter(Boolean).join(' ')
  return (
    <label className={cls}>
      <input
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="ws-switch__track" />
      <span className="ws-switch__thumb" />
    </label>
  )
}
