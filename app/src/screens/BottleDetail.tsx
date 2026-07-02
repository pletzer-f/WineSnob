import { useMemo } from 'react'
import { BottleDetail as BottleDetailCard, Button, Tag } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { scopedBottles } from '@/store/selectors'
import { bottleValue, formatWindow, unitValueNow } from '@/domain/valuation'
import { fmtDef, fmtLitres } from '@/domain/formats'
import { siblingsOf, drinkVerdict } from '@/domain/wine'
import { occasionLabel } from '@/domain/occasions'
import { fmtDate } from '@/lib/date'
import { useMoney } from '@/lib/useMoney'

export function BottleDetailScreen() {
  const s = useStore()
  const money = useMoney()
  const cellar = useMemo(() => scopedBottles(s), [s.bottles, s.activeCellar])
  const selected = cellar.find((b) => b.id === s.selectedId) || null

  const model = useMemo(() => {
    if (!selected) return null
    const dwin = formatWindow(selected)
    const sd = fmtDef(selected.format)

    const paidPer = selected.paid != null && selected.paid > 0 ? selected.paid : null
    const nowPer = unitValueNow(selected)
    let cost: { paid: string; now: string; up: boolean; deltaText: string; cadence: string } | null = null
    if (paidPer != null) {
      const delta = nowPer - paidPer
      const pct = Math.round((delta / paidPer) * 100)
      cost = {
        paid: money(paidPer),
        now: money(Math.round(nowPer)),
        up: delta >= 0,
        deltaText: `${delta >= 0 ? '+' : '−'}${money(Math.abs(Math.round(delta)))} (${delta >= 0 ? '+' : '−'}${Math.abs(pct)}%)`,
        cadence: s.settings.autoValue ? `Refreshed ${s.settings.priceCadence}` : 'Set manually',
      }
    }

    const history = s.drinks
      .filter((r) => r.bottleId === selected.id || (r.name === selected.name && String(r.vintage) === String(selected.vintage)))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((r) => {
        const v = drinkVerdict(r)
        return {
          id: r.id,
          date: fmtDate(r.date),
          occasion: occasionLabel(r.occasion),
          note: r.note,
          hasNote: !!r.note,
          verdict: v.label,
          verdictTone: v.tone,
        }
      })

    const fmt = {
      label: sd.label,
      litres: fmtLitres(sd.litres),
      equivText: sd.equiv === 1 ? 'the standard 750 ml bottle' : `holds ${sd.equiv} standard bottles' worth`,
      held: `${selected.quantity} × ${sd.label.toLowerCase()}`,
      ageNote:
        sd.age > 1
          ? `Large formats age more slowly. This ${sd.label.toLowerCase()}'s window runs to ${dwin.to}, well past the ${selected.drinkTo} of a standard bottle.`
          : sd.age < 1
            ? 'Small formats age faster. Enjoy this one earlier than a full bottle.'
            : '',
    }

    const siblings = siblingsOf(selected, s.bottles).map((o) => {
      const od = fmtDef(o.format)
      return {
        id: o.id,
        label: od.label,
        litres: fmtLitres(od.litres),
        meta: `${o.quantity} held · ${money(bottleValue(o))}`,
      }
    })

    return { dwin, cost, history, fmt, siblings }
  }, [selected, s.drinks, s.bottles, s.settings, money])

  if (!selected || !model) {
    return (
      <div className="ws-mobile-pad" style={page}>
        <button className="ws-linkish" onClick={s.goCellar} style={backBtn}>
          <span style={{ fontSize: 17, lineHeight: 1 }}>←</span> Back to cellar
        </button>
        <div style={{ color: 'var(--ws-muted)' }}>That bottle is no longer in this cellar.</div>
      </div>
    )
  }

  const { dwin, cost, history, fmt, siblings } = model

  return (
    <div className="ws-mobile-pad ws-detail-page" style={page}>
      <button className="ws-linkish" onClick={s.goCellar} style={backBtn}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>←</span> Back to cellar
      </button>

      <BottleDetailCard
        name={selected.name}
        producer={selected.producer}
        vintage={selected.vintage}
        region={selected.region}
        country={selected.country}
        grapes={selected.grapes}
        quantity={selected.quantity}
        status={selected.status}
        value={money(bottleValue(selected))}
        score={selected.score}
        drinkFrom={dwin.from}
        drinkTo={dwin.to}
        notes={selected.note}
        actions={
          <>
            <Button variant="secondary" onClick={() => s.openAddToColl(selected.id)}>
              Add to collection
            </Button>
            <Button variant="secondary" onClick={() => s.openEdit(selected)}>
              Edit
            </Button>
            <Button variant="primary" onClick={() => s.openDrinkLog(selected.id)}>
              Mark a bottle drunk
            </Button>
          </>
        }
      />

      {/* format strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)', flexWrap: 'wrap', padding: 'var(--ws-space-4) var(--ws-space-5)', background: 'var(--ws-cream)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-md)' }}>
        <span style={{ flexShrink: 0, color: 'var(--ws-bordeaux)' }}>
          <svg width="26" height="30" viewBox="0 0 26 30" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
            <path d="M10 2h6v4.5c0 1.2 .4 1.8 1.2 2.8C18.8 11 20 12.6 20 16v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V16c0-3.4 1.2-5 2.8-6.7C9.6 8.3 10 7.7 10 6.5V2z" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)', lineHeight: 1.1 }}>{fmt.label}</div>
          <div style={{ fontSize: 13, color: 'var(--ws-muted)', marginTop: 2 }}>
            {fmt.litres} · {fmt.equivText}
          </div>
        </div>
        <span style={{ flexShrink: 0, fontSize: 12.5, color: 'var(--ws-muted)' }}>{fmt.held}</span>
      </div>

      {/* large-format ageing note */}
      {fmt.ageNote && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 'var(--ws-space-4) var(--ws-space-5)', background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderLeft: '2px solid var(--ws-bordeaux)', borderRadius: 'var(--ws-radius-md)' }}>
          <span style={{ flexShrink: 0, color: 'var(--ws-bordeaux)', fontSize: 15, lineHeight: 1.4 }}>◷</span>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ws-ink)' }}>{fmt.ageNote}</div>
        </div>
      )}

      {/* cost basis */}
      {cost && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-5)', flexWrap: 'wrap', padding: 'var(--ws-space-5)', background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={microLabel}>Price paid</div>
            <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 22, color: 'var(--ws-ink)' }}>{cost.paid}</div>
          </div>
          <span style={{ color: 'var(--ws-border-strong)', fontSize: 18 }}>→</span>
          <div style={{ minWidth: 0 }}>
            <div style={microLabel}>Current value</div>
            <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 22, color: 'var(--ws-ink)' }}>{cost.now}</div>
          </div>
          <div style={{ flex: 1, minWidth: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <Tag tone={cost.up ? 'ready' : 'accent'}>{cost.deltaText}</Tag>
            <span style={{ fontSize: 11, color: 'var(--ws-muted)' }}>{cost.cadence} · per bottle</span>
          </div>
        </div>
      )}

      {/* drinking history */}
      {history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)', padding: 'var(--ws-space-5)', background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--ws-space-4)' }}>
            <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)' }}>Drinking history</div>
            <div style={{ fontSize: 12.5, color: 'var(--ws-muted)' }}>{history.length === 1 ? '1 pour logged' : `${history.length} pours logged`}</div>
          </div>
          {history.map((h) => (
            <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0', borderTop: '0.5px solid var(--ws-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: 'var(--ws-ink)', fontWeight: 500 }}>{h.date}</span>
                <span style={{ fontSize: 12.5, color: 'var(--ws-muted)' }}>{h.occasion}</span>
                <div style={{ flex: 1 }} />
                {h.verdict && <Tag tone={h.verdictTone}>{h.verdict}</Tag>}
              </div>
              {h.hasNote && <div style={{ fontSize: 13.5, color: 'var(--ws-ink)', opacity: 0.8, fontStyle: 'italic', lineHeight: 1.5 }}>{h.note}</div>}
            </div>
          ))}
        </div>
      )}

      {/* buy again toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)', flexWrap: 'wrap' }}>
        <button onClick={() => s.toggleBuyAgain(selected.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13.5, color: 'var(--ws-bordeaux)', padding: '4px 0' }}>
          {selected.buyAgain ? '✓ On your Buy again list. Tap to remove.' : '+ Add to Buy again'}
        </button>
        <span style={{ color: 'var(--ws-border-strong)' }}>·</span>
        <button className="ws-linkish" onClick={() => s.go('wishlist')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13.5, padding: '4px 0' }}>
          View Buy again list <span style={{ fontSize: 15 }}>→</span>
        </button>
      </div>

      {/* same wine, other formats */}
      {siblings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)', padding: 'var(--ws-space-5)', background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)' }}>
          <div>
            <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)' }}>Same wine, other formats</div>
            <div style={{ fontSize: 13, color: 'var(--ws-muted)', marginTop: 2 }}>You hold this vintage in more than one size.</div>
          </div>
          {siblings.map((sib) => (
            <button key={sib.id} className="ws-hairline-btn" onClick={() => s.openBottleById(sib.id)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)', textAlign: 'left', background: 'var(--ws-alabaster)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-md)', padding: '12px var(--ws-space-4)', cursor: 'pointer', font: 'inherit' }}>
              <span style={{ flexShrink: 0, width: 44, textAlign: 'center', fontFamily: 'var(--ws-font-display)', fontSize: 13, color: 'var(--ws-bordeaux)' }}>{sib.litres}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, color: 'var(--ws-ink)' }}>{sib.label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ws-muted)', marginTop: 1 }}>{sib.meta}</div>
              </div>
              <span style={{ fontSize: 16, color: 'var(--ws-muted)', flexShrink: 0 }}>→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const page: React.CSSProperties = {
  width: '100%',
  maxWidth: 760,
  margin: '0 auto',
  padding: 'var(--ws-space-6)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--ws-space-5)',
}
const backBtn: React.CSSProperties = {
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  background: 'none',
  border: 0,
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 14,
  padding: '4px 0',
}
const microLabel: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 4 }
