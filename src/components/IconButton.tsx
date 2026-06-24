import React from 'react'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The icon (e.g. an inline SVG). */
  icon: React.ReactNode
  /** Accessible label — required for an icon-only button. */
  label: string
  /** Add a hairline outline. */
  outline?: boolean
}

/**
 * An icon-only button for toolbars, rows, and headers (overflow menus, close,
 * edit). Always pass `label` for accessibility.
 */
export function IconButton({ icon, label, outline = false, className, ...rest }: IconButtonProps) {
  const cls = ['ws-iconbtn', outline ? 'ws-iconbtn--outline' : '', className].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} aria-label={label} {...rest}>
      {icon}
    </button>
  )
}
