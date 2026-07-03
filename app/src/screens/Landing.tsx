import { useEffect, useState } from 'react'
import { Logo, Button } from 'winesnob-design-system'
import { canPromptInstall, isIOS, onInstallChange, promptInstall } from '@/lib/pwa'
import { useStore } from '@/store/store'

const VALUE_PROPS = [
  { t: 'It reads your labels', d: 'Snap a bottle and WineSnob fills in the vintage, producer and region.' },
  { t: 'It tracks every drink window', d: "Know what's ready tonight and what's worth the wait." },
  { t: 'It always knows the worth', d: 'A live valuation of your whole collection, by region and vintage.' },
]

export function Landing({ onContinue }: { onContinue: () => void }) {
  const [canInstall, setCanInstall] = useState(canPromptInstall())
  const [busy, setBusy] = useState(false)
  const ios = isIOS()

  useEffect(() => onInstallChange(() => setCanInstall(canPromptInstall())), [])

  const install = async () => {
    setBusy(true)
    await promptInstall()
    setBusy(false)
  }

  return (
    <div style={overlay}>
      <div className="ws-stagger" style={panel}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Logo variant="stacked" />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={kicker}>The wine cellar, in your pocket</div>
          <h1 style={h1}>A cellar that knows itself</h1>
          <p style={{ margin: '10px auto 0', maxWidth: 380, fontSize: 15, lineHeight: 1.55, color: 'var(--ws-muted)' }}>
            Catalogue every bottle, track its drink window and worth, and log every pour. Add WineSnob to your
            phone and it opens like a native app.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)', background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', padding: 'var(--ws-space-5)' }}>
          {VALUE_PROPS.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 30, height: 30, marginTop: -4, borderRadius: 999, background: 'var(--ws-cream)', color: 'var(--ws-bordeaux)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ws-font-display)', fontSize: 15 }}>{i + 1}</span>
              <div>
                <div style={{ fontSize: 15, color: 'var(--ws-ink)', fontWeight: 500 }}>{p.t}</div>
                <div style={{ fontSize: 13.5, color: 'var(--ws-muted)', lineHeight: 1.5, marginTop: 2 }}>{p.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Install CTA — platform aware */}
        {canInstall ? (
          <Button variant="primary" onClick={install} disabled={busy}>
            {busy ? 'One moment…' : 'Add WineSnob to your device'}
          </Button>
        ) : ios ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--ws-cream)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', padding: 'var(--ws-space-5)' }}>
            <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)' }}>Add to your Home Screen</div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6, color: 'var(--ws-ink)' }}>
              <li>
                Tap the Share button{' '}
                <span style={{ display: 'inline-flex', verticalAlign: 'middle', color: 'var(--ws-bordeaux)' }}>
                  <ShareGlyph />
                </span>{' '}
                in Safari's toolbar.
              </li>
              <li>Choose <strong style={{ fontWeight: 600 }}>Add to Home Screen</strong>, then tap Add.</li>
              <li>Open WineSnob from your Home Screen and sign in.</li>
            </ol>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ws-muted)', textAlign: 'center', padding: '0 var(--ws-space-4)' }}>
            On your phone, open this page and tap the browser's Share icon, then <strong style={{ color: 'var(--ws-ink)', fontWeight: 600 }}>Add to Home Screen</strong>. In desktop Chrome or Edge, use the install icon at the right of the address bar.
          </div>
        )}

        <button className="ws-linkish" onClick={onContinue} style={{ alignSelf: 'center', background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 14.5, padding: 8 }}>
          Continue in your browser →
        </button>

        <button
          className="ws-linkish"
          onClick={() => useStore.getState().openAdmin()}
          style={{ alignSelf: 'center', background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 12.5, padding: 6, color: 'var(--ws-taupe)' }}
        >
          Log in as Admin
        </button>
      </div>
    </div>
  )
}

function ShareGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v13" />
      <path d="M8 7l4-4 4 4" />
      <path d="M6 12H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
    </svg>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  background: 'var(--ws-bg)',
  overflowY: 'auto',
  display: 'flex',
  justifyContent: 'center',
  fontFamily: 'var(--ws-font-ui)',
  color: 'var(--ws-ink)',
}
const panel: React.CSSProperties = {
  width: '100%',
  maxWidth: 440,
  minHeight: '100%',
  boxSizing: 'border-box',
  padding: 'var(--ws-space-7) var(--ws-space-5)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--ws-space-6)',
  justifyContent: 'center',
}
const kicker: React.CSSProperties = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 10 }
const h1: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 32, lineHeight: 1.1, margin: 0, color: 'var(--ws-ink)' }
