import { useMemo } from 'react'
import { StatCard, SectionHeader, EmptyState, Rating } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { scopedBottles } from '@/store/selectors'
import { fmtDef } from '@/domain/formats'
import { occasionLabel } from '@/domain/occasions'
import { dayMonth, monthName, todayISO } from '@/lib/date'

export function CellarLog() {
  const s = useStore()
  const cellar = useMemo(() => scopedBottles(s), [s.bottles, s.activeCellar])

  const drinks = useMemo(
    () =>
      s.drinks
        .filter((r) => s.activeCellar === 'all' || (r.cellarId || 'main') === s.activeCellar)
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [s.drinks, s.activeCellar],
  )

  const thisYear = parseInt(todayISO().slice(0, 4), 10)

  const logPool = useMemo(() => {
    const yearDrinks = drinks.filter((r) => r.date && parseInt(r.date.slice(0, 4), 10) === thisYear)
    const areaFreq: Record<string, number> = {}
    yearDrinks.forEach((r) => (areaFreq[r.area] = (areaFreq[r.area] || 0) + 1))
    const favArea = Object.entries(areaFreq).sort((a, b) => b[1] - a[1])[0]
    const topRated = yearDrinks.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
    const yearRatings = yearDrinks.filter((r) => r.rating).map((r) => r.rating)
    const avgRating = yearRatings.length ? yearRatings.reduce((a, b) => a + b, 0) / yearRatings.length : 0
    const litresYear = yearDrinks.reduce((sum, r) => sum + fmtDef(r.format).equiv * 0.75, 0)
    const occFreq: Record<string, number> = {}
    yearDrinks.forEach((r) => {
      const k = occasionLabel(r.occasion)
      occFreq[k] = (occFreq[k] || 0) + 1
    })
    const topOcc = Object.entries(occFreq).sort((a, b) => b[1] - a[1])[0]
    const baNames = new Set<string>()
    cellar.filter((b) => b.buyAgain).forEach((b) => baNames.add(`${(b.name || '').toLowerCase()}|${b.vintage}`))
    s.drinks.filter((r) => r.buyAgain).forEach((r) => baNames.add(`${(r.name || '').toLowerCase()}|${r.vintage}`))
    const redsYear = yearDrinks.filter((r) => r.colour === 'red').length
    const whitesYear = yearDrinks.filter((r) => r.colour === 'white' || r.colour === 'sparkling').length

    return [
      { key: 'opened', label: 'Bottles opened', value: String(yearDrinks.length), hint: `in ${thisYear}` },
      { key: 'allTime', label: 'Opened all time', value: String(drinks.length), hint: 'total pours' },
      { key: 'volume', label: 'Volume enjoyed', value: `${litresYear % 1 === 0 ? litresYear : litresYear.toFixed(1)} L`, hint: `in ${thisYear}` },
      { key: 'regions', label: 'Regions explored', value: String(new Set(yearDrinks.map((r) => r.area)).size), hint: 'this year' },
      { key: 'fav', label: 'Favourite region', value: favArea ? favArea[0] : '—', hint: favArea ? `${favArea[1]} ${favArea[1] === 1 ? 'bottle' : 'bottles'}` : 'nothing yet' },
      { key: 'top', label: 'Best in glass', value: topRated ? topRated.name : '—', hint: topRated ? `${topRated.rating}★ · ${topRated.vintage}` : 'unrated' },
      { key: 'avg', label: 'Average rating', value: avgRating ? `${avgRating.toFixed(1)}★` : '—', hint: 'this year' },
      { key: 'occasion', label: 'Top occasion', value: topOcc ? topOcc[0] : '—', hint: topOcc ? `${topOcc[1]} ${topOcc[1] === 1 ? 'time' : 'times'}` : 'nothing yet' },
      { key: 'reds', label: 'Reds vs whites', value: `${redsYear} / ${whitesYear}`, hint: 'red / white' },
      { key: 'buyagain', label: 'To buy again', value: String(baNames.size), hint: baNames.size === 1 ? 'wine' : 'wines' },
    ]
  }, [drinks, cellar, s.drinks, thisYear])

  const yearStats = logPool.filter((p) => s.logStatKeys.includes(p.key))

  const groups = useMemo(() => {
    const list: { label: string; entries: typeof drinks }[] = []
    drinks.forEach((r) => {
      const label = r.date ? monthName(r.date) : 'Undated'
      let g = list.find((x) => x.label === label)
      if (!g) {
        g = { label, entries: [] }
        list.push(g)
      }
      g.entries.push(r)
    })
    return list
  }, [drinks])

  return (
    <div className="ws-mobile-pad" style={page}>
      <div>
        <div style={kicker}>What you’ve been drinking</div>
        <h1 style={h1}>Cellar log</h1>
      </div>

      {drinks.length === 0 ? (
        <EmptyState
          title="No pours logged yet."
          message="Every time you open a bottle, mark it drunk and it lands here, with the occasion, the note and how it drank."
        />
      ) : (
        <>
          {/* year in wine */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--ws-space-4)', flexWrap: 'wrap' }}>
              <SectionHeader title="Your year in wine" count={String(thisYear)} />
              <button className="ws-hairline-btn" onClick={s.openLogStats} style={pillBtn}>
                Configure
              </button>
            </div>
            <div className="ws-log-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(184px, 1fr))', gap: 'var(--ws-space-4)' }}>
              {yearStats.map((st) => (
                <StatCard key={st.key} label={st.label} value={st.value} hint={st.hint} />
              ))}
            </div>
          </div>

          {/* journal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--ws-space-4)' }}>
              <SectionHeader title="The journal" />
              <span style={{ fontSize: 13, color: 'var(--ws-muted)' }}>
                {drinks.length === 1 ? '1 bottle opened, all time' : `${drinks.length} bottles opened, all time`}
              </span>
            </div>
            {groups.map((grp) => (
              <div key={grp.label} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ws-muted)' }}>{grp.label}</div>
                <div style={{ background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', padding: '2px 18px' }}>
                  {grp.entries.map((e) => (
                    <div key={e.id} className="ws-fade" onClick={() => e.bottleId && s.openBottleById(e.bottleId)} style={{ display: 'flex', gap: 'var(--ws-space-4)', padding: 'var(--ws-space-4) 0', borderTop: '0.5px solid var(--ws-border)', cursor: 'pointer' }}>
                      <div style={{ flex: 'none', width: 58, paddingTop: 2 }}>
                        <div style={{ fontSize: 13, color: 'var(--ws-ink)', fontWeight: 500 }}>{e.date ? dayMonth(e.date) : ''}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)' }}>{e.name}</span>
                          <span style={{ fontFamily: 'var(--ws-font-display)', fontSize: 14, color: 'var(--ws-muted)' }}>{String(e.vintage)}</span>
                          {e.buyAgain && (
                            <span className="ws-log-buyagain" style={{ fontSize: 11, color: 'var(--ws-bordeaux)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>+ Buy again</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px 12px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12.5, color: 'var(--ws-muted)' }}>
                            {occasionLabel(e.occasion)}
                            {e.companions ? ` · with ${e.companions}` : ''}
                          </span>
                          <Rating value={e.rating || 0} />
                        </div>
                        {e.note && <div style={{ fontSize: 14, color: 'var(--ws-ink)', opacity: 0.82, fontStyle: 'italic', lineHeight: 1.55, maxWidth: '62ch' }}>{e.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const page: React.CSSProperties = { width: '100%', maxWidth: 860, margin: '0 auto', padding: 'var(--ws-space-6)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-6)' }
const kicker: React.CSSProperties = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 7 }
const h1: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 34, lineHeight: 1, margin: 0, color: 'var(--ws-ink)' }
const pillBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: '0.5px solid var(--ws-border)', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13, color: 'var(--ws-ink)', padding: '7px 15px' }
