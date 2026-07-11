import { useMemo } from 'react'
import {
  SegmentedControl,
  StatCard,
  SearchField,
  FilterChips,
  Select,
  SectionHeader,
  BottleCard,
  CellarRow,
  EmptyState,
  Button,
} from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { scopedBottles } from '@/store/selectors'
import { SMART_COLLECTIONS } from '@/domain/collections'
import { isInlinePhoto } from '@/data/labels'
import { bottleValue } from '@/domain/valuation'
import { fmtDef } from '@/domain/formats'
import { useMoney } from '@/lib/useMoney'
import type { Bottle } from '@/domain/types'

const COLOUR_NAMES: Record<string, string> = {
  red: 'Red',
  white: 'White',
  sparkling: 'Sparkling',
  rose: 'Rosé',
  fortified: 'Fortified',
}
const STATUS_NAMES: Record<string, string> = {
  ready: 'Ready to drink',
  cellaring: 'Still cellaring',
  past: 'Past peak',
}

export function Cellar() {
  const s = useStore()
  const money = useMoney()
  const cellar = useMemo(() => scopedBottles(s), [s.bottles, s.activeCellar])

  // ---- active collection ----
  const colDef = useMemo(() => {
    if (!s.collection) return null
    if (s.collection.startsWith('custom:')) {
      const cc = s.customCollections.find((c) => c.id === s.collection!.slice(7))
      return cc ? { title: cc.title, match: (b: Bottle) => cc.ids.includes(b.id) } : null
    }
    const sd = SMART_COLLECTIONS.find((c) => c.key === s.collection)
    return sd ? { title: sd.title, match: sd.match } : null
  }, [s.collection, s.customCollections])

  const isCellarEmpty = cellar.length === 0 && !colDef

  // ---- summary strip ----
  const pool = useMemo(() => {
    const totalBottles = cellar.reduce((a, b) => a + b.quantity, 0)
    const totalValue = cellar.reduce((a, b) => a + bottleValue(b), 0)
    const readyBottles = cellar.filter((b) => b.status === 'ready').reduce((a, b) => a + b.quantity, 0)
    const regions = new Set(cellar.map((b) => b.area)).size
    const countries = new Set(cellar.map((b) => b.country)).size
    const cellaringBottles = cellar.filter((b) => b.status === 'cellaring').reduce((a, b) => a + b.quantity, 0)
    const avgVintage = cellar.length ? Math.round(cellar.reduce((a, b) => a + (typeof b.vintage === 'number' ? b.vintage : 0), 0) / cellar.length) : 0
    const avgScore = cellar.length ? Math.round(cellar.reduce((a, b) => a + b.score, 0) / cellar.length) : 0
    const byArea: Record<string, number> = {}
    cellar.forEach((b) => (byArea[b.area] = (byArea[b.area] || 0) + bottleValue(b)))
    let topArea = '-'
    let topVal = 0
    Object.entries(byArea).forEach(([a, v]) => {
      if (v > topVal) {
        topVal = v
        topArea = a
      }
    })
    const marketed = cellar.filter((b) => b.marketSource)
    const valueHint = marketed.length ? `market · ${marketed[0].marketSource}` : 'your recorded value'
    return [
      { key: 'bottles', label: 'Bottles', value: totalBottles, hint: `${cellar.length} labels` },
      { key: 'value', label: 'Cellar value', value: money(totalValue), hint: valueHint },
      { key: 'ready', label: 'Ready to drink', value: readyBottles, hint: 'in their window' },
      { key: 'regions', label: 'Regions', value: regions, hint: `${countries} countries` },
      { key: 'cellaring', label: 'Cellaring', value: cellaringBottles, hint: 'resting' },
      { key: 'topRegion', label: 'Top region', value: topArea, hint: money(topVal) },
      { key: 'avgVintage', label: 'Avg vintage', value: avgVintage, hint: 'across the cellar' },
      { key: 'avgScore', label: 'Avg score', value: avgScore, hint: 'points' },
    ]
  }, [cellar, money])

  const statCards = pool.filter((p) => s.statKeys.includes(p.key))

  // ---- filter + search + sort + group ----
  const q = s.query.trim().toLowerCase()
  const colourFilters = s.filters.filter((f) => ['red', 'white', 'sparkling'].includes(f))
  const statusFilters = s.filters.filter((f) => ['ready', 'cellaring', 'past'].includes(f))

  const filtered = useMemo(() => {
    let list = cellar.filter((b) => {
      if (colDef && !colDef.match(b)) return false
      if (colourFilters.length && !colourFilters.includes(b.colour)) return false
      if (statusFilters.length && !statusFilters.includes(b.status)) return false
      if (s.regionFilter !== 'all' && b.area !== s.regionFilter) return false
      if (q && !`${b.name} ${b.producer} ${b.region}`.toLowerCase().includes(q)) return false
      return true
    })
    const vy = (b: Bottle) => (typeof b.vintage === 'number' ? b.vintage : 0)
    const sorters: Record<string, ((a: Bottle, b: Bottle) => number) | null> = {
      recent: null,
      name: (a, b) => a.name.localeCompare(b.name),
      'vintage-desc': (a, b) => vy(b) - vy(a),
      'vintage-asc': (a, b) => vy(a) - vy(b),
      'value-desc': (a, b) => bottleValue(b) - bottleValue(a),
      'score-desc': (a, b) => (b.score || 0) - (a.score || 0),
      window: (a, b) => (a.drinkTo || 9999) - (b.drinkTo || 9999),
    }
    const sorter = sorters[s.sortBy]
    if (sorter) list = list.slice().sort(sorter)
    return list
  }, [cellar, colDef, colourFilters.join(), statusFilters.join(), s.regionFilter, q, s.sortBy])

  // Label photograph thumbnails; rows keep an empty slot when any row in the
  // list has a photo so the vintage column stays aligned.
  const photoThumb = (b: Bottle): string | undefined =>
    b.photo ? (isInlinePhoto(b.photo) ? b.photo : s.labelUrls[b.photo]?.thumb) : undefined
  const anyPhoto = filtered.some((b) => !!photoThumb(b))

  const fBottles = filtered.reduce((a, b) => a + b.quantity, 0)
  const resultLabel = `${filtered.length} ${filtered.length === 1 ? 'wine' : 'wines'} · ${fBottles} ${fBottles === 1 ? 'bottle' : 'bottles'}`

  const groups = useMemo(() => {
    const keyFns: Record<string, (b: Bottle) => string> = {
      region: (b) => b.area,
      colour: (b) => COLOUR_NAMES[b.colour] || b.colour,
      decade: (b) => (typeof b.vintage === 'number' ? `${Math.floor(b.vintage / 10) * 10}s` : 'Non-vintage'),
      status: (b) => STATUS_NAMES[b.status] || b.status,
    }
    const keyFn = keyFns[s.groupBy]
    if (!keyFn) return [{ key: 'all', title: '', count: '', showHeader: false, bottles: filtered }]
    const map = new Map<string, Bottle[]>()
    filtered.forEach((b) => {
      const k = keyFn(b)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(b)
    })
    let entries = [...map.entries()]
    if (s.groupBy === 'decade') entries.sort((a, b) => a[0].localeCompare(b[0]))
    else entries.sort((a, b) => b[1].length - a[1].length)
    return entries.map(([k, list]) => ({
      key: k,
      title: k,
      showHeader: true,
      count: `${list.length} ${list.length === 1 ? 'wine' : 'wines'}`,
      bottles: list,
    }))
  }, [filtered, s.groupBy])

  const allAreas = [...new Set(cellar.map((b) => b.area))].sort()
  const regionFilterOptions = [{ label: 'All regions', value: 'all' }, ...allAreas.map((a) => ({ label: a, value: a }))]
  const advCount = statusFilters.length + (s.regionFilter !== 'all' ? 1 : 0) + (s.groupBy !== 'none' ? 1 : 0)
  const anyFilterActive = s.filters.length > 0 || s.regionFilter !== 'all' || s.groupBy !== 'none'

  if (isCellarEmpty) {
    return (
      <div className="ws-mobile-pad" style={pageStyle}>
        <div style={{ padding: 'var(--ws-space-7) 0' }}>
          <EmptyState
            title="A cellar with no wine in it"
            message="Bold choice. Snap a label, type one in, or import a list. Your collection starts with a single bottle."
            action={
              <Button variant="primary" onClick={() => s.go('add')}>
                Add your first bottle
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="ws-mobile-pad" style={pageStyle}>
      {/* title + view toggle */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--ws-space-4)', flexWrap: 'wrap' }}>
        <div>
          <div style={kicker}>Your collection</div>
          <h1 style={h1}>Cellar</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)', flexWrap: 'wrap' }}>
          <button className="ws-hairline-btn" onClick={s.openStats} style={pillBtn}>
            Customise
          </button>
          <SegmentedControl
            options={[
              { key: 'grid', label: 'Grid' },
              { key: 'list', label: 'List' },
            ]}
            value={s.view}
            onChange={(v) => s.setView(v as 'grid' | 'list')}
          />
        </div>
      </div>

      {/* active collection banner */}
      {colDef && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)', background: 'var(--ws-alabaster)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-md)', padding: '11px 15px' }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ws-bordeaux)' }} />
          <span style={{ fontSize: 14, color: 'var(--ws-ink)' }}>
            Showing the <strong style={{ fontWeight: 600 }}>{colDef.title}</strong> collection
          </span>
          <button className="ws-linkish" onClick={s.clearCollection} style={{ marginLeft: 'auto', background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13 }}>
            Clear ×
          </button>
        </div>
      )}

      {/* summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--ws-space-4)' }}>
        {statCards.map((c) => (
          <StatCard key={c.key} label={c.label} value={c.value} hint={c.hint} />
        ))}
      </div>

      {/* search + recommend + notes */}
      <div style={{ display: 'flex', gap: 'var(--ws-space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <SearchField
            placeholder="Search by wine, producer or region"
            value={s.query}
            onChange={(e) => s.setQuery(e.target.value)}
          />
        </div>
        <button className="ws-hairline-btn" onClick={() => s.openSommelier()} style={{ ...pillBtn, color: 'var(--ws-ink)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ws-bordeaux)' }} />
          Ask the sommelier
        </button>
        <button className="ws-linkish" onClick={s.goNotes} style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 14, padding: '10px 6px' }}>
          All notes
        </button>
      </div>

      {/* structured filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 190 }}>
            <FilterChips
              options={[
                { key: 'red', label: 'Red' },
                { key: 'white', label: 'White' },
                { key: 'sparkling', label: 'Sparkling' },
              ]}
              selected={s.filters}
              onToggle={s.toggleFilter}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 170 }}>
              <Select
                options={SORT_OPTIONS}
                value={s.sortBy}
                onChange={(e) => s.setSort(e.target.value)}
              />
            </div>
            <button className="ws-hairline-btn" onClick={s.toggleFiltersPanel} aria-label="More filters" style={{ ...pillBtn, color: 'var(--ws-ink)', height: 44 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" style={{ flex: 'none' }}>
                <line x1="3" y1="8" x2="21" y2="8" />
                <circle cx="9" cy="8" r="2.6" fill="var(--ws-surface)" />
                <line x1="3" y1="16" x2="21" y2="16" />
                <circle cx="15" cy="16" r="2.6" fill="var(--ws-surface)" />
              </svg>
              Filters
              {advCount > 0 && (
                <span style={{ minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box', borderRadius: 999, background: 'var(--ws-bordeaux)', color: 'var(--ws-bg)', fontSize: 11, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {advCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {s.filtersOpen && (
          <div style={{ background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', padding: 'var(--ws-space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={fieldLabel}>Drink status</span>
              <FilterChips
                options={[
                  { key: 'ready', label: 'Ready' },
                  { key: 'cellaring', label: 'Cellaring' },
                  { key: 'past', label: 'Past peak' },
                ]}
                selected={s.filters}
                onToggle={s.toggleFilter}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--ws-space-5)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={fieldLabel}>Region</span>
                <Select options={regionFilterOptions} value={s.regionFilter} onChange={(e) => s.setRegionFilter(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={fieldLabel}>Group by</span>
                <SegmentedControl
                  options={[
                    { key: 'none', label: 'None' },
                    { key: 'region', label: 'Region' },
                    { key: 'colour', label: 'Colour' },
                    { key: 'decade', label: 'Age' },
                    { key: 'status', label: 'Status' },
                  ]}
                  value={s.groupBy}
                  onChange={s.setGroup}
                />
              </div>
            </div>
            {anyFilterActive && (
              <div style={{ display: 'flex', alignItems: 'center', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-4)' }}>
                <button className="ws-linkish ws-linkish--accent" onClick={s.clearAllFilters} style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13, padding: 0 }}>
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* result count */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--ws-space-3)', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-4)' }}>
        <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)' }}>{resultLabel}</div>
      </div>

      {/* results */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--ws-space-7) var(--ws-space-5)' }}>
          <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 22, color: 'var(--ws-ink)', marginBottom: 8 }}>Nothing matches that</div>
          <div style={{ fontSize: 14, color: 'var(--ws-muted)' }}>Loosen a filter or try a different search.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-6)' }}>
          {groups.map((g) => (
            <div key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
              {g.showHeader && <SectionHeader title={g.title} count={g.count} />}
              {s.view === 'grid' ? (
                <div className="ws-cellar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--ws-space-4)' }}>
                  {g.bottles.map((b) => {
                    const d = fmtDef(b.format)
                    return (
                      <div key={b.id} className="ws-lift" onClick={() => s.openBottle(b)} style={{ position: 'relative', cursor: 'pointer' }}>
                        {d.equiv !== 1 && (
                          <span style={{ position: 'absolute', bottom: 30, right: 22, zIndex: 2, fontSize: 10, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ws-bordeaux)', background: 'var(--ws-cream)', padding: '4px 10px', borderRadius: 999, pointerEvents: 'none' }}>
                            {d.label}
                          </span>
                        )}
                        <BottleCard name={b.name} producer={b.producer} vintage={b.vintage} region={b.region} quantity={b.quantity} status={b.status} value={money(bottleValue(b))} photo={photoThumb(b)} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', padding: '2px 16px', boxShadow: 'var(--ws-shadow-sm)' }}>
                  {g.bottles.map((b) => (
                    <div key={b.id} onClick={() => s.openBottle(b)} style={{ cursor: 'pointer' }}>
                      <CellarRow name={b.name} producer={b.producer} vintage={b.vintage} region={b.region} quantity={b.quantity} status={b.status} photo={photoThumb(b) ?? (anyPhoto ? null : undefined)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const SORT_OPTIONS = [
  { label: 'Recently added', value: 'recent' },
  { label: 'Name (A–Z)', value: 'name' },
  { label: 'Vintage: newest', value: 'vintage-desc' },
  { label: 'Vintage: oldest', value: 'vintage-asc' },
  { label: 'Value: highest', value: 'value-desc' },
  { label: 'Score: highest', value: 'score-desc' },
  { label: 'Drink window: soonest', value: 'window' },
]

const pageStyle: React.CSSProperties = {
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
const pillBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: 'none',
  border: '0.5px solid var(--ws-border)',
  borderRadius: 999,
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 13,
  color: 'var(--ws-muted)',
  padding: '9px 15px',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
}
const fieldLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ws-muted)' }
