import React from 'react'
import { Tag } from './Tag'

export interface BottleCardProps {
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
  /** Estimated value, preformatted (e.g. "€420"). */
  value?: string
  className?: string
}

const STATUS: Record<
  NonNullable<BottleCardProps['status']>,
  { label: string; tone: 'ready' | 'cellar' | 'neutral' }
> = {
  ready: { label: 'Ready to drink', tone: 'ready' },
  cellaring: { label: 'Cellaring', tone: 'cellar' },
  past: { label: 'Past peak', tone: 'neutral' },
}

/**
 * The signature WineSnob component — one bottle in the cellar. Shows the
 * cuvée, producer, vintage and key facts, with a drink-window status tag and
 * a coloured spine (racing green when ready to drink, bordeaux otherwise).
 */
export function BottleCard({
  name,
  producer,
  vintage,
  region,
  quantity,
  status = 'cellaring',
  value,
  className,
}: BottleCardProps) {
  const s = STATUS[status]
  const cls = ['ws-bottle', status === 'ready' ? 'ws-bottle--ready' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls}>
      <span className="ws-bottle__spine" />
      <div className="ws-bottle__body">
        <div className="ws-bottle__head">
          <div>
            <p className="ws-bottle__name">{name}</p>
            {producer && <p className="ws-bottle__producer">{producer}</p>}
          </div>
          {vintage && <span className="ws-bottle__vintage">{vintage}</span>}
        </div>
        <div className="ws-bottle__meta">
          {region && (
            <div className="ws-bottle__meta-item">
              <span className="ws-bottle__meta-label">Region</span>
              <span className="ws-bottle__meta-value">{region}</span>
            </div>
          )}
          {typeof quantity === 'number' && (
            <div className="ws-bottle__meta-item">
              <span className="ws-bottle__meta-label">In cellar</span>
              <span className="ws-bottle__meta-value">
                {quantity} {quantity === 1 ? 'bottle' : 'bottles'}
              </span>
            </div>
          )}
          {value && (
            <div className="ws-bottle__meta-item">
              <span className="ws-bottle__meta-label">Value</span>
              <span className="ws-bottle__meta-value">{value}</span>
            </div>
          )}
        </div>
        <div className="ws-bottle__foot">
          <Tag tone={s.tone} dot>
            {s.label}
          </Tag>
        </div>
      </div>
    </div>
  )
}
