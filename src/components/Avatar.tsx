import React from 'react'

export interface AvatarProps {
  /** Full name — used for initials when no image is given. */
  name?: string
  /** Image URL. */
  src?: string
  /** Diameter in px. */
  size?: number
  className?: string
}

function initials(name?: string) {
  if (!name) return '·'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/**
 * A person's avatar — their photo, or their initials in bordeaux on cream.
 */
export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  const cls = ['ws-avatar', className].filter(Boolean).join(' ')
  return (
    <span
      className={cls}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-label={name}
    >
      {src ? <img src={src} alt={name ?? ''} /> : initials(name)}
    </span>
  )
}
