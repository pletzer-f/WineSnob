import { useMemo } from 'react'
import { Rating } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { scopedBottles } from '@/store/selectors'

export function Notes() {
  const s = useStore()
  const cellar = useMemo(() => scopedBottles(s), [s.bottles, s.activeCellar])
  const notes = cellar.filter((b) => b.note)

  return (
    <div className="ws-mobile-pad" style={page}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--ws-space-4)', flexWrap: 'wrap' }}>
        <div>
          <div style={kicker}>Tasting, in your own words</div>
          <h1 style={h1}>All notes</h1>
        </div>
        <div style={{ fontSize: 14, color: 'var(--ws-muted)' }}>{`${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}</div>
      </div>
      <div>
        {notes.map((b) => (
          <div key={b.id} className="ws-fade" onClick={() => s.openBottle(b)} style={{ cursor: 'pointer', padding: 'var(--ws-space-5) 0', borderTop: '0.5px solid var(--ws-border)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--ws-space-4)' }}>
              <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 19, color: 'var(--ws-ink)', minWidth: 0 }}>
                {b.name} <span style={{ color: 'var(--ws-muted)', fontSize: 15 }}>{String(b.vintage)}</span>
              </div>
              <div style={{ flex: 'none', fontSize: 13, color: 'var(--ws-muted)', whiteSpace: 'nowrap' }}>{b.region}</div>
            </div>
            <div style={{ margin: '9px 0 11px' }}>
              <Rating value={b.rating || Math.round((b.score || 0) / 20)} score={b.score || undefined} />
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--ws-ink)', maxWidth: '64ch' }}>{b.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const page: React.CSSProperties = { width: '100%', maxWidth: 800, margin: '0 auto', padding: 'var(--ws-space-6)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-5)' }
const kicker: React.CSSProperties = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 7 }
const h1: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 34, lineHeight: 1, margin: 0, color: 'var(--ws-ink)' }
