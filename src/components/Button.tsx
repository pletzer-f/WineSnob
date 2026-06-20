import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. `primary` is the single bordeaux call-to-action — use it once per view. */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Compact size for toolbars and inline actions. */
  size?: 'md' | 'sm'
}

/**
 * The WineSnob button. `primary` is the one bordeaux action per screen;
 * `secondary` is a hairline-outlined action; `ghost` is text-only.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = ['ws-btn', `ws-btn--${variant}`, size === 'sm' ? 'ws-btn--sm' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}
