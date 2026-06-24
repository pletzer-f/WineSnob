import React from 'react'
import { Tag } from './Tag'
import { Rating } from './Rating'
import { DrinkWindow } from './DrinkWindow'

export interface BottleDetailProps {
  name: string
  producer?: string
  vintage?: string | number
  region?: string
  country?: string
  grapes?: string[]
  quantity?: number
  status?: 'ready' | 'cellaring' | 'past'
  /** Estimated value, preformatted (e.g. "€4,200"). */
  value?: string
  /** 100-point score. */
  score?: number
  /** Drink-window start year. */
  drinkFrom?: number
  /** Drink-window end year. */
  drinkTo?: number
  notes?: string
  /** Footer actions (e.g. Buttons). */
  actions?: React.ReactNode
  className?: string
}

const STATUS: Record<
  NonNullable<BottleDetailProps['status']>,
  { label: string; tone: 'ready' | 'cellar' | 'neutral' }
> = {
  ready: { label: 'Ready to drink', tone: 'ready' },
  cellaring: { label: 'Cellaring', tone: 'cellar' },
  past: { label: 'Past peak', tone: 'neutral' },
}

/**
 * The full bottle view — every fact about a wine: producer, vintage, region,
 * grapes, value, score, drink window and notes, with an actions row.
 */
export function BottleDetail({
  name,
  producer,
  vintage,
  region,
  country,
  grapes,
  quantity,
  status = 'cellaring',
  value,
  score,
  drinkFrom,
  drinkTo,
  notes,
  actions,
  className,
}: BottleDetailProps) {
  const s = STATUS[status]
  const cls = ['ws-detail', className].filter(Boolean).join(' ')
  const meta: { label: string; value: React.ReactNode }[] = []
  if (region) meta.push({ label: 'Region', value: country ? `${region}, ${country}` : region })
  if (grapes && grapes.length) meta.push({ label: 'Grapes', value: grapes.join(', ') })
  if (typeof quantity === 'number')
    meta.push({ label: 'In cellar', value: `${quantity} ${quantity === 1 ? 'bottle' : 'bottles'}` })
  if (value) meta.push({ label: 'Value', value })

  return (
    <div className={cls}>
      <div className="ws-detail__head">
        <div>
          <h1 className="ws-detail__name">{name}</h1>
          {producer && <p className="ws-detail__producer">{producer}</p>}
        </div>
        {vintage && <span className="ws-detail__vintage">{vintage}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)', flexWrap: 'wrap' }}>
        <Tag tone={s.tone} dot>
          {s.label}
        </Tag>
        {typeof score === 'number' && <Rating value={Math.round(score / 20)} score={score} />}
      </div>
      {meta.length > 0 && (
        <div className="ws-detail__meta">
          {meta.map((m, i) => (
            <div key={i}>
              <div className="ws-detail__meta-label">{m.label}</div>
              <div className="ws-detail__meta-value">{m.value}</div>
            </div>
          ))}
        </div>
      )}
      {typeof drinkFrom === 'number' && typeof drinkTo === 'number' && (
        <DrinkWindow from={drinkFrom} to={drinkTo} />
      )}
      {notes && <p className="ws-detail__notes">{notes}</p>}
      {actions && <div className="ws-detail__actions">{actions}</div>}
    </div>
  )
}
