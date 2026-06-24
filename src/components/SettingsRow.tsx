import React from 'react'

export interface SettingsRowProps {
  /** The setting name. */
  label: string
  /** Optional supporting description. */
  description?: string
  /** Right-aligned control (e.g. a Switch) or value. */
  control?: React.ReactNode
  onClick?: () => void
  className?: string
}

/**
 * A row in a settings or account list — label, optional description, and a
 * control on the right (a Switch, a value, a chevron).
 */
export function SettingsRow({ label, description, control, onClick, className }: SettingsRowProps) {
  const cls = ['ws-setting', className].filter(Boolean).join(' ')
  return (
    <div className={cls} onClick={onClick}>
      <div className="ws-setting__body">
        <p className="ws-setting__label">{label}</p>
        {description && <p className="ws-setting__desc">{description}</p>}
      </div>
      {control && <div className="ws-setting__control">{control}</div>}
    </div>
  )
}
