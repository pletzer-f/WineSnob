import React from 'react'

export interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {}

/**
 * The cellar search field — a rounded input with a leading search glyph.
 * Wraps a native input, so all input attributes pass through.
 */
export function SearchField({
  className,
  placeholder = 'Search the cellar',
  ...rest
}: SearchFieldProps) {
  const cls = ['ws-search', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <span className="ws-search__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
      </span>
      <input className="ws-search__input" type="search" placeholder={placeholder} {...rest} />
    </div>
  )
}
