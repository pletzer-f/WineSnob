import { useMemo, useState } from 'react'
import { SegmentedControl, SectionHeader, BarChart, DrinkWindow, Tag } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { bottleValue, unitValueNow } from '@/domain/valuation'
import {
  RANGES,
  allocation,
  concentration,
  costBasis,
  movers,
  realized,
  seriesFor,
  windowLadder,
  type AllocationDim,
  type RangeKey,
} from '@/domain/portfolio'
import { todayISO } from '@/lib/date'
import { useMoney } from '@/lib/useMoney'

const DONUT_COLOURS = ['var(--ws-bordeaux)', 'var(--ws-green)', 'var(--ws-taupe)', 'rgba(110, 36, 51, 0.45)', 'rgba(27, 67, 50, 0.4)', 'var(--ws-stone)']

function fmtPct(p: number): string {
  const v = Math.abs(p) >= 100 ? Math.round(p) : Math.round(p * 10) / 10
  return `${p > 0 ? '+' : ''}${v}%`
}

/** The portfolio: the whole estate as one holding, broker style. */
export function Stats() {
  const s = useStore()
  const money = useMoney()
  const [range, setRange] = useState<RangeKey>('6M')
  const [dim, setDim] = useState<AllocationDim>('region')
  const [hover, setHover] = useState<number | null>(null)

  const today = todayISO()
  const thisYear = parseInt(today.slice(0, 4), 10)
  const bottles = s.bottles

  const model = useMemo(() => {
    const cb = costBasis(bottles)
    const mv = movers(bottles, 3)
    const rz = realized(s.drinks, bottles, thisYear)
    const alloc = allocation(bottles, dim)
    const ladder = windowLadder(bottles, thisYear)
    const conc = concentration(bottles)
    const series = seriesFor(s.snapshots, range, today)

    const positions = bottles
      .map((b) => {
        const now = unitValueNow(b)
        return {
          id: b.id,
          name: b.name,
          vintage: String(b.vintage),
          region: b.area || b.region,
          qty: b.quantity,
          format: b.format,
          value: bottleValue(b),
          pct: b.paid != null && b.paid > 0 ? ((now - b.paid) / b.paid) * 100 : null,
          market: !!b.marketSource,
        }
      })
      .filter((p) => p.qty > 0)
      .sort((a, b) => b.value - a.value)

    const marketed = bottles.filter((b) => b.marketSource)
    const valSource = marketed[0]?.marketSource
    const valAsOf = marketed.map((b) => b.marketAsOf).filter(Boolean).sort().pop()

    const readyN = bottles.filter((b) => b.status === 'ready').reduce((a, b) => a + b.quantity, 0)
    const cellaringN = bottles.filter((b) => b.status === 'cellaring').reduce((a, b) => a + b.quantity, 0)
    const pastN = bottles.filter((b) => b.status === 'past').reduce((a, b) => a + b.quantity, 0)
    const readiness = [
      { label: 'Ready to drink', value: readyN, hint: 'in their window now', dot: 'var(--ws-green)' },
      { label: 'Still cellaring', value: cellaringN, hint: 'maturing', dot: 'var(--ws-taupe, var(--ws-border-strong))' },
      { label: 'Past peak', value: pastN, hint: 'drink up', dot: 'var(--ws-muted)' },
    ]
    const windows = bottles
      .filter((b) => typeof b.drinkFrom === 'number' && b.score)
      .slice()
      .sort((a, b) => (a.drinkTo || 0) - (b.drinkTo || 0))
      .slice(0, 4)
      .map((b) => ({ name: b.name, region: b.area, from: b.drinkFrom!, to: b.drinkTo!, status: b.status }))

    return { cb, mv, rz, alloc, ladder, conc, series, positions, valSource, valAsOf, readiness, windows }
  }, [bottles, s.drinks, s.snapshots, dim, range, thisYear, today])

  const { cb, mv, rz, alloc, ladder, conc, series, positions } = model

  // ---- chart geometry ----
  const pts = series.points
  const chart = useMemo(() => {
    if (pts.length < 2) return null
    const values = pts.map((p) => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = (max - min) * 0.12 || max * 0.04 || 1
    const lo = min - pad
    const span = max + pad - lo
    const xy = pts.map((p, i) => ({
      x: (i / (pts.length - 1)) * 100,
      y: 100 - ((p.value - lo) / span) * 100,
    }))
    return { xy, line: xy.map((p) => `${p.x},${p.y}`).join(' ') }
  }, [pts])

  const active = hover != null && pts[hover] ? { pt: pts[hover], pos: chart?.xy[hover] } : null

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!pts.length) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const f = Math.max(0, Math.min(1, (cx - rect.left) / rect.width))
    const idx = Math.round(f * (pts.length - 1))
    if (idx !== hover) setHover(idx)
  }

  const up = series.delta >= 0
  const deltaColor = up ? 'var(--ws-green)' : 'var(--ws-bordeaux)'
  const gainUp = cb.gain >= 0

  const empty = bottles.length === 0

  return (
    <div className="ws-mobile-pad" style={page}>
      <div>
        <div style={kicker}>All cellars, as one holding</div>
        <h1 style={h1}>Portfolio</h1>
      </div>

      {/* ---- value hero ---- */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--ws-space-3)', flexWrap: 'wrap' }}>
          <div>
            <div style={microLabel}>Portfolio value</div>
            <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 40, lineHeight: 1, color: 'var(--ws-ink)' }}>
              {money(active ? active.pt.value : cb.totalMarket)}
            </div>
            <div style={{ marginTop: 8, fontSize: 13.5, fontWeight: 500, color: series.deltaPct == null ? 'var(--ws-muted)' : deltaColor }}>
              {active
                ? active.pt.day
                : series.deltaPct == null
                  ? empty
                    ? 'Add bottles to begin'
                    : 'History begins today'
                  : `${up ? '+' : '−'}${money(Math.abs(Math.round(series.delta)))} (${fmtPct(series.deltaPct)}) · ${RANGES.find((r) => r.key === range)?.label}`}
            </div>
          </div>
          <div className="ws-folio-ranges">
            {RANGES.map((r) => (
              <button key={r.key} className={`ws-folio-range${range === r.key ? ' ws-folio-range--on' : ''}`} onClick={() => setRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {chart ? (
          <div
            style={{ position: 'relative', height: 128, touchAction: 'none', cursor: 'crosshair' }}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onTouchStart={onMove}
            onTouchMove={onMove}
            onTouchEnd={() => setHover(null)}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
              <polyline points={chart.line} fill="none" stroke={deltaColor} strokeWidth="0.7" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div
              style={{
                position: 'absolute',
                left: `${chart.xy[chart.xy.length - 1].x}%`,
                top: `${chart.xy[chart.xy.length - 1].y}%`,
                width: 7,
                height: 7,
                borderRadius: 999,
                background: deltaColor,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />
            {active && active.pos && (
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${active.pos.x}%`, width: 1, background: 'var(--ws-border-strong)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
            )}
          </div>
        ) : (
          <div style={{ height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', border: '1px dashed var(--ws-border)', borderRadius: 'var(--ws-radius-md)', padding: '0 var(--ws-space-5)' }}>
            <span style={{ fontSize: 13, color: 'var(--ws-muted)', lineHeight: 1.5 }}>
              {empty ? 'Your chart will draw itself once there are bottles to value.' : 'Recording history from today. The chart appears with your next valuations.'}
            </span>
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--ws-muted)' }}>
          {model.valSource
            ? `Live market pricing via ${model.valSource}${model.valAsOf ? `, as of ${model.valAsOf}` : ''}. History recorded ${pts.length > 0 ? `since ${s.snapshots[0]?.day}` : 'from today'}.`
            : `Your recorded values. History recorded ${s.snapshots.length > 0 ? `since ${s.snapshots[0]?.day}` : 'from today'}; run a valuation in Settings for live market pricing.`}
        </div>
      </div>

      {/* ---- invested vs market + realized ---- */}
      {!empty && (
        <div className="ws-stat-duo ws-folio-duo">
          <div style={card}>
            <div style={microLabel}>Invested</div>
            <div style={bigFigure}>{money(Math.round(cb.invested))}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
              <Tag tone={gainUp ? 'ready' : 'accent'}>{`${gainUp ? '+' : '−'}${money(Math.abs(Math.round(cb.gain)))}${cb.gainPct != null ? ` (${fmtPct(cb.gainPct)})` : ''}`}</Tag>
            </div>
            <div style={hintText}>
              {cb.invested > 0
                ? `now worth ${money(Math.round(cb.marketOfInvested))}${cb.coverage < 0.999 ? `, across the ${Math.round(cb.coverage * 100)}% of bottles with a known cost` : ''}`
                : 'add what you paid to track returns'}
            </div>
          </div>
          <div style={card}>
            <div style={microLabel}>Realized</div>
            <div style={bigFigure}>{rz.countYear}</div>
            <div style={hintText}>
              {`bottles enjoyed in ${thisYear} · ${rz.count} all time${rz.valued > 0 ? ` · ≈ ${money(Math.round(rz.value))} of value drunk` : ''}`}
            </div>
          </div>
        </div>
      )}

      {/* ---- desk note ---- */}
      {s.portfolioNote && !empty && (
        <div style={{ ...card, borderLeft: '2px solid var(--ws-bordeaux)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...microLabel, color: 'var(--ws-bordeaux)' }}>Desk note · {s.portfolioNote.asOf}</div>
          <div style={{ fontFamily: 'var(--ws-font-display)', fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.55, color: 'var(--ws-ink)' }}>
            {s.portfolioNote.text}
          </div>
        </div>
      )}

      {/* ---- movers ---- */}
      {(mv.up.length > 0 || mv.down.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
          <SectionHeader title="Movers" count="vs what you paid" />
          <div style={{ ...card, padding: '4px var(--ws-space-5)' }}>
            {[...mv.up, ...mv.down].map((m) => {
              const pos = m.pct >= 0
              return (
                <button key={m.id} className="ws-fade ws-folio-row" onClick={() => s.openBottleById(m.id)}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="ws-clamp2" style={{ display: 'block', fontFamily: 'var(--ws-font-display)', fontSize: 16, color: 'var(--ws-ink)', lineHeight: 1.3 }}>
                      {m.name} <span style={{ color: 'var(--ws-muted)', fontSize: 13.5 }}>{m.vintage}</span>
                    </span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ws-muted)', marginTop: 2 }}>
                      {`${pos ? '+' : '−'}${money(Math.abs(Math.round(m.abs)))} across the holding`}
                    </span>
                  </span>
                  <span style={{ flex: 'none', fontSize: 15, fontWeight: 600, color: pos ? 'var(--ws-green)' : 'var(--ws-bordeaux)' }}>{fmtPct(m.pct)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- holdings ---- */}
      {positions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
          <SectionHeader title="Holdings" count={`${positions.length} positions`} />
          <div style={{ ...card, padding: '4px var(--ws-space-5)' }}>
            {positions.map((p) => (
              <button key={p.id} className="ws-fade ws-folio-row" onClick={() => s.openBottleById(p.id)}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="ws-clamp2" style={{ display: 'block', fontFamily: 'var(--ws-font-display)', fontSize: 16, color: 'var(--ws-ink)', lineHeight: 1.3 }}>
                    {p.name} <span style={{ color: 'var(--ws-muted)', fontSize: 13.5 }}>{p.vintage}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ws-muted)', marginTop: 2 }}>
                    {p.region} · {p.qty} {p.format !== 'standard' ? `× ${p.format}` : p.qty === 1 ? 'bottle' : 'bottles'}
                  </span>
                </span>
                <span style={{ flex: 'none', textAlign: 'right' }}>
                  <span style={{ display: 'block', fontFamily: 'var(--ws-font-display)', fontSize: 16, color: 'var(--ws-ink)' }}>{money(Math.round(p.value))}</span>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginTop: 2, color: p.pct == null ? 'var(--ws-border-strong)' : p.pct >= 0 ? 'var(--ws-green)' : 'var(--ws-bordeaux)' }}>
                    {p.pct == null ? '· ·' : fmtPct(p.pct)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- allocation ---- */}
      {alloc.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
          <SectionHeader
            title="Allocation"
            action={
              <SegmentedControl
                options={[
                  { key: 'region', label: 'Region' },
                  { key: 'colour', label: 'Colour' },
                  { key: 'decade', label: 'Decade' },
                ]}
                value={dim}
                onChange={(v) => setDim(v as AllocationDim)}
              />
            }
          />
          <div className="ws-folio-alloc" style={card}>
            <Donut slices={alloc.map((a) => a.pct)} />
            <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {alloc.map((a, i) => (
                <div key={a.label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ flex: 'none', width: 8, height: 8, borderRadius: 999, background: DONUT_COLOURS[i % DONUT_COLOURS.length], alignSelf: 'center' }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--ws-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ws-muted)' }}>{money(Math.round(a.value))}</span>
                  <span style={{ width: 44, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--ws-ink)' }}>{Math.round(a.pct)}%</span>
                </div>
              ))}
            </div>
          </div>
          {conc && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 16px', background: conc.flagged ? 'var(--ws-cream)' : 'var(--ws-alabaster)', border: '0.5px solid var(--ws-border)', borderLeft: conc.flagged ? '2px solid var(--ws-bordeaux)' : '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-md)' }}>
              <span style={{ flex: 'none', width: 7, height: 7, borderRadius: 999, background: conc.flagged ? 'var(--ws-bordeaux)' : 'var(--ws-green)', marginTop: 5 }} />
              <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ws-ink)' }}>{conc.line}</span>
            </div>
          )}
        </div>
      )}

      {/* ---- drink-window ladder ---- */}
      {ladder.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
          <SectionHeader title="Drink-window ladder" count="value by maturity" />
          <div style={card}>
            <BarChart data={ladder.map((r) => ({ label: r.label, value: r.value, display: money(Math.round(r.value)) }))} />
            <div style={{ fontSize: 12, color: 'var(--ws-muted)', marginTop: 12 }}>
              How much value must be drunk when, like a bond ladder. Value in the first rung wants attention.
            </div>
          </div>
        </div>
      )}

      {/* ---- readiness ---- */}
      {!empty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
          <SectionHeader title="Drink-window readiness" />
          <div className="ws-readiness" style={card}>
            {model.readiness.map((r) => (
              <div key={r.label} className="ws-readiness__item">
                <div className="ws-readiness__label">
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: r.dot, flex: 'none' }} />
                  {r.label}
                </div>
                <div className="ws-readiness__num">{r.value}</div>
                <div className="ws-readiness__hint">{r.hint}</div>
              </div>
            ))}
          </div>
          {model.windows.length > 0 && (
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)', marginTop: 'var(--ws-space-2)' }}>
              <div style={{ fontSize: 13, color: 'var(--ws-muted)' }}>Drinking soonest</div>
              {model.windows.map((w) => (
                <div key={w.name} className="ws-window-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="ws-clamp2" style={{ fontFamily: 'var(--ws-font-display)', fontSize: 16, color: 'var(--ws-ink)', lineHeight: 1.3 }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ws-muted)' }}>{w.region}</div>
                  </div>
                  <DrinkWindow from={w.from} to={w.to} current={thisYear} status={w.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** A thin donut from percentage slices, in the brand palette. */
function Donut({ slices }: { slices: number[] }) {
  const R = 40
  const C = 2 * Math.PI * R
  let acc = 0
  return (
    <svg width="128" height="128" viewBox="0 0 100 100" style={{ flex: 'none', transform: 'rotate(-90deg)' }} aria-hidden="true">
      {slices.map((pct, i) => {
        const len = (pct / 100) * C
        const el = (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={DONUT_COLOURS[i % DONUT_COLOURS.length]}
            strokeWidth="11"
            strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`}
            strokeDashoffset={-acc}
          />
        )
        acc += len
        return el
      })}
    </svg>
  )
}

const page: React.CSSProperties = {
  width: '100%',
  maxWidth: 860,
  margin: '0 auto',
  padding: 'var(--ws-space-6)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--ws-space-6)',
}
const kicker: React.CSSProperties = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 7 }
const h1: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 34, lineHeight: 1, margin: 0, color: 'var(--ws-ink)' }
const card: React.CSSProperties = {
  background: 'var(--ws-surface)',
  border: '0.5px solid var(--ws-border)',
  borderRadius: 'var(--ws-radius-lg)',
  boxShadow: 'var(--ws-shadow-sm)',
  padding: 'var(--ws-space-5)',
}
const microLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 6 }
const bigFigure: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontSize: 28, lineHeight: 1.05, color: 'var(--ws-ink)' }
const hintText: React.CSSProperties = { fontSize: 12.5, color: 'var(--ws-muted)', marginTop: 7, lineHeight: 1.45 }
