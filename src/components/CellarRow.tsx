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
  className,
}: CellarRowProps) {
  const cls = ['ws-row', className].filter(Boolean).join(' ')
  const sub = [producer, region].filter(Boolean).join(' · ')
  return (
    <div className={cls}>
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
