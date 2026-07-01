import { useMemo } from 'react'
import { Button } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { scopedBottles } from '@/store/selectors'
import { SMART_COLLECTIONS } from '@/domain/collections'
import { bottleValue } from '@/domain/valuation'
import { useMoney } from '@/lib/useMoney'

export function Collections() {
  const s = useStore()
  const money = useMoney()
  const cellar = useMemo(() => scopedBottles(s), [s.bottles, s.activeCellar])

  const custom = useMemo(
    () =>
      s.customCollections.map((c) => {
        const mem = cellar.filter((b) => c.ids.includes(b.id))
        const bn = mem.reduce((a, b) => a + b.quantity, 0)
        const empty = mem.length === 0
        return {
          id: c.id,
          title: c.title,
          desc: c.desc || 'No description yet.',
          empty,
          count: mem.length,
          countLabel: mem.length === 1 ? 'wine' : 'wines',
          value: empty ? 'Empty, add bottles' : `${money(mem.reduce((a, b) => a + bottleValue(b), 0))} · ${bn} ${bn === 1 ? 'bottle' : 'bottles'}`,
          tags: [...new Set(mem.map((b) => b.area))].slice(0, 4),
        }
      }),
    [s.customCollections, cellar, money],
  )

  const smart = useMemo(
    () =>
      SMART_COLLECTIONS.map((c) => {
        const mem = cellar.filter(c.match)
        const bn = mem.reduce((a, b) => a + b.quantity, 0)
        return {
          key: c.key,
          title: c.title,
          desc: c.desc,
          count: mem.length,
          countLabel: mem.length === 1 ? 'wine' : 'wines',
          value: `${money(mem.reduce((a, b) => a + bottleValue(b), 0))} · ${bn} ${bn === 1 ? 'bottle' : 'bottles'}`,
          tags: [...new Set(mem.map((b) => b.area))].slice(0, 4),
        }
      }).filter((c) => c.count > 0),
    [cellar, money],
  )

  return (
    <div className="ws-mobile-pad" style={page}>
      <div>
        <div style={kicker}>Ways to read your cellar</div>
        <h1 style={h1}>Collections</h1>
      </div>

      {/* your collections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--ws-space-4)', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--ws-bordeaux)' }} />
              <h2 style={h2}>Your collections</h2>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ws-muted)' }}>Curated by hand. Add any bottle from its page or from here.</div>
          </div>
          <Button variant="primary" size="sm" onClick={s.openNewCollection}>
            New collection
          </Button>
        </div>

        {custom.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', alignItems: 'stretch', gap: 'var(--ws-space-4)' }}>
            {custom.map((c) => (
              <div key={c.id} style={{ ...cardBase, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                <div onClick={() => s.openCustomCollection(c.id)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--ws-space-3)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={collTitle}>{c.title}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ws-muted)' }}>{c.desc}</div>
                    </div>
                    <span style={{ flex: 'none', fontSize: 17, color: 'var(--ws-muted)', lineHeight: 1 }}>→</span>
                  </div>
                  {!c.empty && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {c.tags.map((t) => (
                        <span key={t} style={tag}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-4)', marginTop: 'auto' }}>
                  <div style={{ minWidth: 0 }}>
                    <div>
                      <span style={{ fontFamily: 'var(--ws-font-display)', fontSize: 20, color: 'var(--ws-ink)' }}>{c.count}</span>{' '}
                      <span style={{ fontSize: 12, color: 'var(--ws-muted)' }}>{c.countLabel}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ws-muted)', marginTop: 2 }}>{c.value}</div>
                  </div>
                  <button className="ws-hairline-btn" onClick={() => s.openEditCollection(c.id)} style={{ marginLeft: 'auto', flex: 'none', background: 'none', border: '0.5px solid var(--ws-border)', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13, color: 'var(--ws-muted)', padding: '7px 15px' }}>
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'var(--ws-surface)', border: '1px dashed var(--ws-border-strong)', borderRadius: 'var(--ws-radius-lg)', padding: 'var(--ws-space-6)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 20, color: 'var(--ws-ink)', marginBottom: 6 }}>No collections of your own yet</div>
            <div style={{ fontSize: 14, color: 'var(--ws-muted)', marginBottom: 'var(--ws-space-4)' }}>Group bottles however you like: by occasion, by project, by whim.</div>
            <div style={{ display: 'inline-flex' }}>
              <Button variant="primary" onClick={s.openNewCollection}>
                Create your first collection
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* smart collections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-6)' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, border: '1.5px solid var(--ws-muted)', boxSizing: 'border-box' }} />
            <h2 style={h2}>Smart collections</h2>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ws-muted)' }}>Filled automatically by rule; they update as your cellar changes.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', alignItems: 'stretch', gap: 'var(--ws-space-4)' }}>
          {smart.map((c) => (
            <button key={c.key} className="ws-card-btn ws-lift" onClick={() => s.openCollection(c.key)} style={{ ...cardBase, textAlign: 'left', cursor: 'pointer', font: 'inherit', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--ws-space-3)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={collTitle}>{c.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ws-muted)' }}>{c.desc}</div>
                </div>
                <span style={{ flex: 'none', fontSize: 17, color: 'var(--ws-muted)', lineHeight: 1 }}>→</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {c.tags.map((t) => (
                  <span key={t} style={tag}>
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--ws-space-4)', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-4)', marginTop: 'auto' }}>
                <div>
                  <span style={{ fontFamily: 'var(--ws-font-display)', fontSize: 20, color: 'var(--ws-ink)' }}>{c.count}</span>{' '}
                  <span style={{ fontSize: 12, color: 'var(--ws-muted)' }}>{c.countLabel}</span>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ws-muted)' }}>{c.value}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const page: React.CSSProperties = { width: '100%', maxWidth: 1120, margin: '0 auto', padding: 'var(--ws-space-6)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-7)' }
const kicker: React.CSSProperties = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 7 }
const h1: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 34, lineHeight: 1, margin: 0, color: 'var(--ws-ink)' }
const h2: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 22, lineHeight: 1, margin: 0, color: 'var(--ws-ink)' }
const cardBase: React.CSSProperties = { background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', padding: 'var(--ws-space-5)' }
const collTitle: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontSize: 22, lineHeight: 1.12, color: 'var(--ws-ink)', marginBottom: 7 }
const tag: React.CSSProperties = { fontSize: 11, letterSpacing: '0.03em', color: 'var(--ws-muted)', border: '0.5px solid var(--ws-border)', borderRadius: 999, padding: '3px 10px' }
