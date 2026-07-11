import { useEffect, useRef, useState } from 'react'
import { useStore, type SomTurn } from '@/store/store'
import { askSommelier, downscaleImage, type SomPick, type SomTurnPayload } from '@/data/ai'
import { todayISO } from '@/lib/date'

const STARTERS = [
  'What should we open tonight?',
  'Pair a wine with steak au poivre',
  'Which bottle should I leave alone for years?',
  'Something to impress a collector',
]

/** The floating concierge: a wine-glass button on every screen and a
 * full-height sheet where the sommelier answers from the owner's own cellar. */
export function Sommelier() {
  const open = useStore((s) => s.somOpen)
  const openSommelier = useStore((s) => s.openSommelier)
  return (
    <>
      {!open && (
        <button className="ws-som-fab" aria-label="Ask the sommelier" onClick={() => openSommelier()}>
          <GlassGlyph />
        </button>
      )}
      {open && <SommelierSheet />}
    </>
  )
}

function buildContext(s: ReturnType<typeof useStore.getState>) {
  const bottles = s.bottles.slice(0, 150).map((b) => ({
    id: b.id,
    name: b.name,
    producer: b.producer,
    vintage: String(b.vintage),
    region: [b.region, b.area].filter(Boolean).join(', '),
    colour: b.colour,
    qty: b.quantity,
    format: b.format,
    status: b.status,
    window: `${b.drinkFrom ?? '?'}-${b.drinkTo ?? '?'}`,
    rating: b.rating || undefined,
    score: b.score || undefined,
    unit: b.unit || undefined,
    note: b.note ? b.note.slice(0, 90) : undefined,
  }))
  return {
    today: todayISO(),
    currency: s.settings.currency,
    owner: s.account.name || undefined,
    cellar: bottles,
    cellarTruncated: s.bottles.length > 150 ? s.bottles.length : undefined,
    wishlist: s.wishlist.map((w) => `${w.name} ${w.vintage || ''}`.trim()),
  }
}

function SommelierSheet() {
  const s = useStore()
  const [draft, setDraft] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)

  const turns = s.somTurns
  const busy = s.somBusy

  const send = async (text: string, image?: string | null) => {
    const clean = text.trim()
    if ((!clean && !image) || busyRef.current) return
    busyRef.current = true
    const st = useStore.getState()
    st.somPush({ role: 'user', text: clean, image: image || null })
    st.setSomBusy(true)
    setDraft('')
    setPhoto(null)
    try {
      // Replay the conversation; keep photos only from the last two user turns.
      const all = [...useStore.getState().somTurns]
      const userIdx = all.map((t, i) => (t.role === 'user' ? i : -1)).filter((i) => i >= 0)
      const keepImages = new Set(userIdx.slice(-2))
      const payload: SomTurnPayload[] = all.map((t, i) =>
        t.role === 'user'
          ? { role: 'user', text: t.text, image: keepImages.has(i) ? t.image : null }
          : { role: 'assistant', text: t.raw || t.text },
      )
      const res = await askSommelier(payload, buildContext(useStore.getState()))
      useStore.getState().somPush({ role: 'sommelier', text: res.reply, picks: res.picks, quickReplies: res.quickReplies, raw: res.raw })
    } catch (e) {
      useStore.getState().somPush({
        role: 'sommelier',
        text: 'Forgive me, I lost my train of thought. Ask me once more.',
        error: true,
      })
      console.error('sommelier', e)
    } finally {
      useStore.getState().setSomBusy(false)
      busyRef.current = false
    }
  }

  // A seeded question (e.g. from a bottle page) sends itself on open.
  useEffect(() => {
    const seed = s.consumeSomSeed()
    if (seed) void send(seed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns.length, busy])

  const attach = async (files: FileList | null) => {
    if (!files || !files[0]) return
    try {
      setPhoto(await downscaleImage(files[0]))
    } catch {
      useStore.getState().flash('Could not read that photo')
    }
  }

  const lastTurn = turns[turns.length - 1]
  const chips = !busy && lastTurn?.role === 'sommelier' && lastTurn.quickReplies?.length ? lastTurn.quickReplies : null

  return (
    <div className="ws-som-scrim" onClick={s.closeSommelier}>
      <div className="ws-som-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="ws-som-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ws-som-kicker">At your service</div>
            <div className="ws-som-title">Sommelier</div>
          </div>
          {turns.length > 0 && (
            <button className="ws-linkish" onClick={s.resetSommelier} style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13, padding: 6 }}>
              New thread
            </button>
          )}
          <button className="ws-modal__close" aria-label="Close" onClick={s.closeSommelier}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </header>

        <div className="ws-som-scroll" ref={scrollRef}>
          {turns.length === 0 && (
            <div className="ws-som-empty">
              <p className="ws-som-intro">
                Tell me the occasion, the dish, or simply the mood, and I will pour from your own cellar. You can also send a photo of the menu or the plate.
              </p>
              <div className="ws-som-chips">
                {STARTERS.map((q) => (
                  <button key={q} className="ws-som-chip" onClick={() => void send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t, i) => (
            <Turn key={i} t={t} />
          ))}

          {busy && (
            <div className="ws-som-thinking">
              Consulting the cellar<span className="ws-som-dots" />
            </div>
          )}

          {chips && (
            <div className="ws-som-chips">
              {chips.map((q) => (
                <button key={q} className="ws-som-chip" onClick={() => void send(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        <footer className="ws-som-input">
          {photo && (
            <div className="ws-som-attach">
              <img src={photo} alt="Attached" />
              <button aria-label="Remove photo" onClick={() => setPhoto(null)}>
                ×
              </button>
            </div>
          )}
          <div className="ws-som-inputrow">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void attach(e.target.files)} />
            <button className="ws-som-cam" aria-label="Send a photo" onClick={() => fileRef.current?.click()}>
              <CameraGlyph />
            </button>
            <textarea
              className="ws-som-field"
              rows={1}
              placeholder="Ask your sommelier"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(draft, photo)
                }
              }}
            />
            <button className="ws-som-send" aria-label="Send" disabled={busy || (!draft.trim() && !photo)} onClick={() => void send(draft, photo)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function Turn({ t }: { t: SomTurn }) {
  if (t.role === 'user') {
    return (
      <div className="ws-som-user">
        {t.image && <img className="ws-som-userimg" src={t.image} alt="" />}
        {t.text && <div className="ws-som-bubble">{t.text}</div>}
      </div>
    )
  }
  return (
    <div className="ws-som-turn">
      <div className="ws-som-label">Sommelier</div>
      <div className="ws-som-reply">{t.text}</div>
      {t.picks && t.picks.length > 0 && (
        <div className="ws-som-picks">
          {t.picks.map((p, i) => (
            <PickCard key={i} p={p} />
          ))}
        </div>
      )}
    </div>
  )
}

const ROLE_LABEL: Record<SomPick['role'], string> = { top: 'The pour', alternate: 'Or instead', buy: 'One to buy' }

function PickCard({ p }: { p: SomPick }) {
  const s = useStore()
  const inCellar = !!p.bottleId && s.bottles.some((b) => b.id === p.bottleId)
  const wished = s.wishlist.some((w) => (w.name || '').toLowerCase() === (p.name || '').toLowerCase())
  return (
    <div className={`ws-som-pick ws-som-pick--${p.role}`}>
      <div className="ws-som-pick-role">{ROLE_LABEL[p.role]}</div>
      <div className="ws-som-pick-name">
        {p.name} <span className="ws-som-pick-vintage">{p.vintage}</span>
      </div>
      <div className="ws-som-pick-why">{p.why}</div>
      <div className="ws-som-pick-serve">
        <span>Serve</span> {p.serve}
      </div>
      {p.sayThis && (
        <div className="ws-som-say">
          <div className="ws-som-say-label">Say this at the table</div>
          <div className="ws-som-say-line">“{p.sayThis}”</div>
        </div>
      )}
      <div className="ws-som-pick-foot">
        {inCellar ? (
          <button
            className="ws-linkish ws-linkish--accent ws-som-pick-link"
            onClick={() => {
              s.openBottleById(p.bottleId)
              s.closeSommelier()
            }}
          >
            Open bottle page →
          </button>
        ) : p.role === 'buy' ? (
          wished ? (
            <span style={{ fontSize: 13, color: 'var(--ws-green)' }}>On your wishlist ✓</span>
          ) : (
            <button className="ws-som-pick-link ws-hairline-btn" onClick={() => s.wishFromBuyAgain({ name: p.name, vintage: p.vintage, producer: '', region: '' })} style={{ border: '0.5px solid var(--ws-border)', borderRadius: 999, padding: '6px 13px', background: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13, color: 'var(--ws-bordeaux)' }}>
              Add to wishlist
            </button>
          )
        ) : null}
      </div>
    </div>
  )
}

/** The sommelier, traced from the owner's reference icon: swept hair with
 * its curl, bow tie, buttoned coat, the bottle with its label, and the glass. */
export function GlassGlyph({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* hair: crown sweep ending in the fringe notch on the right */}
      <path d="M10.6 13.4v-3.2c0-4.8 3.8-7.6 8.4-7.6 3.1 0 5.6 1.1 6.9 3.3 2 .2 3.5 1.8 3.5 4v3.5h-2.6" />
      {/* the curl at the crown */}
      <path d="M25.9 5.9c1.3-.5 2.6-.2 3.3.7" />
      {/* face */}
      <path d="M10.6 13.4c0 5.8 3.3 9.7 8.4 9.7s8.4-3.9 8.4-9.7" />
      {/* bow tie: two wings and the knot */}
      <path d="M17.6 26.6l-3.4-1.6a1 1 0 0 0-1.4.9v4.5a1 1 0 0 0 1.4.9l3.4-1.6z" />
      <path d="M20.4 26.6l3.4-1.6a1 1 0 0 1 1.4.9v4.5a1 1 0 0 1-1.4.9l-3.4-1.6z" />
      <rect x="17.6" y="25.5" width="2.8" height="5.2" rx="1.2" />
      {/* coat: left edge, rounded bottom corner, hem running to the bottle */}
      <path d="M13.9 27.6c-4.7 1.7-7.6 5.1-7.6 10.3v5.1a2.5 2.5 0 0 0 2.5 2.5h22.4" />
      <path d="M24.1 27.6c2.7 1 4.7 2.6 5.9 4.8" />
      {/* arm seam */}
      <path d="M13 45.5V33.6" />
      {/* placket and its three toggle bars */}
      <path d="M19 32.6v2M19 37.2v1.6M19 41.6v1.6" />
      <rect x="16.3" y="34.4" width="5.4" height="2.2" rx="1.1" />
      <rect x="16.3" y="38.8" width="5.4" height="2.2" rx="1.1" />
      <rect x="16.3" y="43.2" width="5.4" height="2.2" rx="1.1" />
      {/* bottle: cap, neck, shoulders, body, base */}
      <rect x="33.6" y="21.8" width="4" height="2.8" rx="1" />
      <path d="M34.3 24.6v3.6c0 2.1-2.8 2.4-2.8 5.4v9.2a2.6 2.6 0 0 0 2.6 2.6h3a2.6 2.6 0 0 0 2.6-2.6v-9.2c0-3-2.8-3.3-2.8-5.4v-3.6" />
      {/* the label */}
      <rect x="31.5" y="35.2" width="4.6" height="4.6" rx="1.1" />
      {/* glass: bowl with its fill line, stem, foot */}
      <path d="M40.9 30.6h6.8" />
      <path d="M40.9 30.6c0 3.6 1 6.3 3.4 7.1 2.4-.8 3.4-3.5 3.4-7.1" />
      <path d="M41.3 34.2h6" />
      <path d="M44.3 37.9v5.4" />
      <path d="M41.6 45.4c.7-.6 1.6-.9 2.7-.9s2 .3 2.7.9" />
    </svg>
  )
}

function CameraGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.4" />
    </svg>
  )
}
