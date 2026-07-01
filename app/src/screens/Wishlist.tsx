import { useMemo } from 'react'
import { Button, SectionHeader, Tag, Rating, EmptyState } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { fmtDate } from '@/lib/date'
import { useMoney } from '@/lib/useMoney'
import type { Priority } from '@/domain/types'

type TagTone = 'neutral' | 'ready' | 'cellar' | 'accent'

const TONE_BY_PRIORITY: Record<Priority, TagTone> = { grail: 'accent', high: 'cellar', medium: 'neutral' }
const LABEL_BY_PRIORITY: Record<Priority, string> = { grail: 'Grail', high: 'High priority', medium: 'Someday' }
const REASON_TEXT: Record<string, string> = {
  flagged: 'Marked to buy again',
  finished: 'Finished the last bottle',
  loved: 'Loved when you drank it',
}

export function Wishlist() {
  const s = useStore()
  const money = useMoney()

  const wishlist = useMemo(
    () =>
      s.wishlist.map((w) => ({
        id: w.id,
        name: w.name,
        tone: TONE_BY_PRIORITY[w.priority] || 'neutral',
        priorityLabel: LABEL_BY_PRIORITY[w.priority] || '',
        meta: [w.producer, w.region, w.vintage].filter(Boolean).join(' · '),
        note: w.note,
        hasNote: !!w.note,
        target: w.targetPrice != null ? money(w.targetPrice) : 'Open',
      })),
    [s.wishlist, money],
  )

  const buyAgain = useMemo(() => {
    const all = s.bottles
    const key = (n: string, v: unknown) => `${(n || '').toLowerCase()}|${v}`
    type Entry = { key: string; name: string; vintage: unknown; producer?: string; area?: string; region?: string; rating: number; lastDate: string; reasons: Set<string> }
    const map: Entry[] = []
    const push = (src: { name: string; vintage: unknown; producer?: string; area?: string; region?: string; rating?: number; date?: string }, from: string) => {
      const k = key(src.name, src.vintage)
      let e = map.find((x) => x.key === k)
      if (!e) {
        e = { key: k, name: src.name, vintage: src.vintage, producer: src.producer, area: src.area, region: src.region, rating: 0, lastDate: '', reasons: new Set() }
        map.push(e)
      }
      e.reasons.add(from)
      if (src.rating && src.rating > e.rating) e.rating = src.rating
      if (src.date && src.date > e.lastDate) e.lastDate = src.date
    }
    all.filter((b) => b.buyAgain).forEach((b) => push({ name: b.name, vintage: b.vintage, producer: b.producer, area: b.area, region: b.region, rating: b.rating || Math.round((b.score || 0) / 20) }, 'flagged'))
    all.filter((b) => b.quantity === 0 && (b.rating >= 4 || (b.score || 0) >= 92)).forEach((b) => push({ name: b.name, vintage: b.vintage, producer: b.producer, area: b.area, region: b.region, rating: b.rating || Math.round((b.score || 0) / 20) }, 'finished'))
    s.drinks.filter((r) => r.buyAgain).forEach((r) => push(r, 'loved'))

    const heldNow = (n: string, v: unknown) => all.filter((b) => key(b.name, b.vintage) === key(n, v)).reduce((a, b) => a + b.quantity, 0)
    const alreadyWished = (n: string) => s.wishlist.some((w) => (w.name || '').toLowerCase() === (n || '').toLowerCase())

    return map
      .sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''))
      .map((e) => {
        const held = heldNow(e.name, e.vintage)
        return {
          key: e.key,
          name: e.name,
          vintage: e.vintage,
          producer: e.producer,
          region: e.region,
          meta: [e.producer, e.area].filter(Boolean).join(' · '),
          rating: e.rating,
          reason: [...e.reasons].map((r) => REASON_TEXT[r]).filter(Boolean)[0] || 'Buy again',
          lastText: e.lastDate ? `Last drunk ${fmtDate(e.lastDate)}` : held ? `${held} still in cellar` : '',
          heldText: held ? `${held} in cellar` : 'None left',
          wished: alreadyWished(e.name),
        }
      })
  }, [s.bottles, s.drinks, s.wishlist])

  return (
    <div className="ws-mobile-pad" style={page}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--ws-space-4)', flexWrap: 'wrap' }}>
        <div>
          <div style={kicker}>On the hunt &amp; worth repeating</div>
          <h1 style={h1}>Wishlist &amp; Buy again</h1>
        </div>
        <Button variant="secondary" onClick={s.openNewWish}>
          Add a wish
        </Button>
      </div>

      {wishlist.length > 0 ? (
        <>
          <div>
            <SectionHeader title="On the hunt" />
          </div>
          <div style={{ background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', padding: '2px 18px' }}>
            {wishlist.map((w) => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--ws-space-4)', padding: 'var(--ws-space-4) 0', borderTop: '0.5px solid var(--ws-border)' }}>
                <div className="ws-fade" onClick={() => s.openEditWish(w.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 'var(--ws-space-4)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--ws-font-display)', fontSize: 18, color: 'var(--ws-ink)' }}>{w.name}</span>
                      <Tag tone={w.tone}>{w.priorityLabel}</Tag>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ws-muted)', marginTop: 4 }}>{w.meta}</div>
                    {w.hasNote && <div style={{ fontSize: 14, color: 'var(--ws-ink)', opacity: 0.78, marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>{w.note}</div>}
                  </div>
                  <div style={{ flex: 'none', textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)' }}>{w.target}</div>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginTop: 3 }}>target price</div>
                  </div>
                </div>
                <button className="ws-danger-hover" onClick={() => s.removeWish(w.id)} aria-label="Remove from wishlist" style={{ flex: 'none', width: 30, height: 30, borderRadius: 999, border: '0.5px solid var(--ws-border)', background: 'none', cursor: 'pointer', color: 'var(--ws-muted)', fontSize: 16, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--ws-space-4)' }}>
          <EmptyState title="Nothing on the hunt." message="Add the bottles you’re chasing and we’ll keep the list close." />
          <Button variant="primary" onClick={s.openNewWish}>
            Add your first wish
          </Button>
        </div>
      )}

      {buyAgain.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
          <SectionHeader title="Buy again" count={buyAgain.length === 1 ? '1 wine' : `${buyAgain.length} wines`} />
          <div style={{ fontSize: 13.5, color: 'var(--ws-muted)', margin: '-6px 0 2px', maxWidth: '60ch' }}>
            Wines you finished, loved, or flagged — one tap moves them onto your hunt list.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--ws-space-4)' }}>
            {buyAgain.map((b) => (
              <div key={b.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)', background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', padding: 'var(--ws-space-5)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--ws-font-display)', fontSize: 18, color: 'var(--ws-ink)', lineHeight: 1.2 }}>{b.name}</span>
                    <span style={{ fontFamily: 'var(--ws-font-display)', fontSize: 15, color: 'var(--ws-muted)' }}>{String(b.vintage)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ws-muted)', marginTop: 4 }}>{b.meta}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Rating value={b.rating} />
                  <span style={{ fontSize: 12, color: 'var(--ws-muted)' }}>{b.heldText}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ws-bordeaux)' }}>{b.reason}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--ws-space-3)', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-3)', marginTop: 'auto' }}>
                  <span style={{ fontSize: 12, color: 'var(--ws-muted)' }}>{b.lastText}</span>
                  {b.wished ? (
                    <span style={{ fontSize: 13, color: 'var(--ws-green)' }}>On wishlist ✓</span>
                  ) : (
                    <button className="ws-danger-hover" onClick={() => s.wishFromBuyAgain(b)} style={{ background: 'none', border: '0.5px solid var(--ws-border)', borderRadius: 999, padding: '6px 13px', font: 'inherit', fontSize: 13, color: 'var(--ws-bordeaux)', cursor: 'pointer' }}>
                      Add to wishlist
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const page: React.CSSProperties = { width: '100%', maxWidth: 860, margin: '0 auto', padding: 'var(--ws-space-6)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-6)' }
const kicker: React.CSSProperties = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 7 }
const h1: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 34, lineHeight: 1, margin: 0, color: 'var(--ws-ink)' }
