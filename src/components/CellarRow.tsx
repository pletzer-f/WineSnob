import React from 'react'
import { Tag } from './Tag'

export interface CellarRowProps {
  /** Wine name / cuvée. */
  name: string
  /** Producer or château. */
  producer?: string
  /** Vintage year. */
  vintage?: string | number
  /** Region or appellation. */
  region?: string
  /** Bottles held. */
  quantity?: number
  /** Drink-window status. */
  status?: 'ready' | 'cellaring' | 'past'
  /** Label photograph URL. Pass a string to show it, `null` to keep an empty
   * placeholder slot (so mixed lists stay aligned), or omit for no photo
   * column at all. */
  photo?: string | null
  className?: string
}

/**
 * A compact list row for the cellar — vintage, name, producer/region and
 * quantity on a single line. Stack these in a list; pairs with BottleCard.
 */
export function CellarRow({
  name,
  producer,
  vintage,
  region,
  quantity,
  status,
  photo,
  className,
}: CellarRowProps) {
  const cls = ['ws-row', className].filter(Boolean).join(' ')
  const sub = [producer, region].filter(Boolean).join(' · ')
  return (
    <div className={cls}>
      {photo && <img className="ws-row__photo" src={photo} alt="" loading="lazy" />}
      {photo === null && (
        <span className="ws-row__photo ws-row__photo--empty" aria-hidden>
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round">
            <path d="M4.4 1h3.2v2.3c0 .7.2 1 .7 1.6.9 1 1.5 1.8 1.5 3.6V14a1 1 0 0 1-1 1H3.2a1 1 0 0 1-1-1V8.5c0-1.8.6-2.6 1.5-3.6.5-.6.7-.9.7-1.6V1z" />
          </svg>
        </span>
      )}
      <span className="ws-row__vintage">{vintage || '—'}</span>
      <div className="ws-row__main">
        <p className="ws-row__name">{name}</p>
        {sub && <p className="ws-row__sub">{sub}</p>}
      </div>
      {status === 'ready' && <Tag tone="ready">Ready</Tag>}
      {typeof quantity === 'number' && <span className="ws-row__qty">×{quantity}</span>}
    </div>
  )
}
