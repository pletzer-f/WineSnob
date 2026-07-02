import { useMemo, useState } from 'react'
import { SegmentedControl, StatCard, SectionHeader, BarChart, DrinkWindow } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { scopedBottles } from '@/store/selectors'
import { bottleValue } from '@/domain/valuation'
import { valueChart } from '@/domain/chart'
import { useMoney } from '@/lib/useMoney'
import type { Bottle } from '@/domain/types'

const COLOUR_NAMES: Record<string, string> = { red: 'Red', white: 'White', sparkling: 'Sparkling', rose: 'Rosé', fortified: 'Fortified' }

export function Stats() {
  const s = useStore()
  const money = useMoney()
  const cellar = useMemo(() => scopedBottles(s), [s.bottles, s.activeCellar])
  const [hover, setHover] = useState<number | null>(null)

  const measure = s.measure
  const isValue = measure === 'value'

  const model = useMemo(() => {
    const amt = (b: Bottle) => (isValue ? bottleValue(b) : b.quantity)
    const disp = (n: number) => (isValue ? money(n) : `${n}`)
    const sumBy = (keyFn: (b: Bottle) => string) => {
      const map: Record<string, number> = {}
      cellar.forEach((b) => (map[keyFn(b)] = (map[keyFn(b)] || 0) + amt(b)))
      return map
    }
    const toBars = (map: Record<string, number>, n: number) =>
      Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([label, value]) => ({ label, value, display: disp(value) }))

    const regionMap = sumBy((b) => b.area)
    const byRegion = toBars(regionMap, 6)
    const byColour = toBars(sumBy((b) => COLOUR_NAMES[b.colour] || b.colour), 6)
    const byDecade = Object.entries(sumBy((b) => (typeof b.vintage === 'number' ? `${Math.floor(b.vintage / 10) * 10}s` : 'NV')))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value, display: disp(value) }))

    const totalValueNum = cellar.reduce((a, b) => a + bottleValue(b), 0)
    const totalBottlesNum = cellar.reduce((a, b) => a + b.quantity, 0)
    const regionValueMap: Record<string, number> = {}
    cellar.forEach((b) => (regionValueMap[b.area] = (regionValueMap[b.area] || 0) + bottleValue(b)))
    const topRegionEntry = Object.entries(regionValueMap).sort((a, b) => b[1] - a[1])[0] || ['-', 0]

    const readyN = cellar.filter((b) => b.status === 'ready').reduce((a, b) => a + b.quantity, 0)
    const cellaringN = cellar.filter((b) => b.status === 'cellaring').reduce((a, b) => a + b.quantity, 0)
    const pastN = cellar.filter((b) => b.status === 'past').reduce((a, b) => a + b.quantity, 0)
    const readiness = [
      { label: 'Ready to drink', value: readyN, hint: 'in their window now', dot: 'var(--ws-green)' },
      { label: 'Still cellaring', value: cellaringN, hint: 'maturing', dot: 'var(--ws-taupe, var(--ws-border-strong))' },
      { label: 'Past peak', value: pastN, hint: 'drink up', dot: 'var(--ws-muted)' },
    ]
    const windows = cellar
      .filter((b) => typeof b.drinkFrom === 'number' && b.score)
      .slice()
      .sort((a, b) => (a.drinkTo || 0) - (b.drinkTo || 0))
      .slice(0, 4)
      .map((b) => ({ name: b.name, region: b.area, from: b.drinkFrom!, to: b.drinkTo!, status: b.status }))

    const chart = valueChart(totalValueNum, money)
    return { byRegion, byColour, byDecade, totalValueNum, totalBottlesNum, topRegionEntry, readiness, windows, chart, regionCount: Object.keys(regionMap).length }
  }, [cellar, isValue, money])

  const activePt = hover != null && model.chart.valueSeries[hover] ? model.chart.valueSeries[hover] : null

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    let f = (cx - rect.left) / rect.width
    f = Math.max(0, Math.min(1, f))
    const idx = Math.round(f * 9)
    if (idx !== hover) setHover(idx)
  }

  return (
    <div className="ws-mobile-pad" style={page}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--ws-space-4)', flexWrap: 'wrap' }}>
        <div>
          <div style={kicker}>The collection, measured</div>
          <h1 style={h1}>Stats</h1>
        </div>
        <SegmentedControl
          options={[
            { key: 'value', label: 'By value' },
            { key: 'bottles', label: 'By bottles' },
          ]}
          value={measure}
          onChange={(v) => s.setMeasure(v as 'value' | 'bottles')}
        />
      </div>

      {/* value hero + summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--ws-space-4)', alignItems: 'stretch' }}>
        <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--ws-space-4)', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--ws-space-3)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 6 }}>Cellar value</div>
              <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 40, lineHeight: 1, color: 'var(--ws-ink)' }}>{money(model.totalValueNum)}</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ws-green)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ws-green)' }} />
              +8.4% this year
            </div>
          </div>
          <div
            style={{ position: 'relative', height: 120, margin: 'var(--ws-space-2) 0', touchAction: 'none', cursor: 'crosshair' }}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onTouchStart={onMove}
            onTouchMove={onMove}
            onTouchEnd={() => setHover(null)}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
              <polyline points={model.chart.linePoints} fill="none" stroke="var(--ws-bordeaux)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', left: model.chart.endX, top: model.chart.endY, width: 8, height: 8, borderRadius: 999, background: 'var(--ws-bordeaux)', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
            {activePt && (
              <>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: activePt.leftPct, width: 1, background: 'var(--ws-border-strong)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: activePt.leftPct, top: activePt.topPct, width: 9, height: 9, borderRadius: 999, background: 'var(--ws-surface)', border: '2px solid var(--ws-bordeaux)', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 2 }} />
                <div style={{ position: 'absolute', left: activePt.leftPct, top: activePt.topPct, transform: 'translate(-50%, calc(-100% - 14px))', background: 'var(--ws-ink)', color: 'var(--ws-bg)', padding: '6px 11px', borderRadius: 'var(--ws-radius-sm)', whiteSpace: 'nowrap', textAlign: 'center', pointerEvents: 'none', zIndex: 3, boxShadow: 'var(--ws-shadow-md)' }}>
                  <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 14, lineHeight: 1.1 }}>{activePt.valueLabel}</div>
                  <div style={{ opacity: 0.65, fontSize: 11, letterSpacing: '0.04em', marginTop: 2 }}>{activePt.label}</div>
                </div>
              </>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ws-muted)' }}>Estimated market value, last ten quarters. Touch or hover the line to explore.</div>
        </div>
        <div className="ws-stat-duo">
          <StatCard label="Bottles" value={model.totalBottlesNum} hint={`${cellar.length} distinct wines`} />
          <StatCard label="Most-valued region" value={model.topRegionEntry[0] as string} hint={`${money(model.topRegionEntry[1] as number)} held`} />
        </div>
      </div>

      {/* breakdown charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--ws-space-5)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)', minWidth: 0 }}>
          <SectionHeader title="By region" count={model.regionCount} />
          <div style={card}>
            <BarChart data={model.byRegion} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)', minWidth: 0 }}>
          <SectionHeader title="By colour" />
          <div style={card}>
            <BarChart data={model.byColour} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
        <SectionHeader title="By decade" />
        <div style={card}>
          <BarChart data={model.byDecade} />
        </div>
      </div>

      {/* readiness */}
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
                <DrinkWindow from={w.from} to={w.to} current={2026} status={w.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const page: React.CSSProperties = {
  width: '100%',
  maxWidth: 1120,
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
