import { useState } from 'react'
import { Logo, TextField, Select, SegmentedControl, FilterChips, Button } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { hasSupabase, supabase } from '@/lib/supabase'
import type { Currency } from '@/domain/types'

const CURRENCY_OPTIONS = [
  { label: 'Euro (€)', value: 'EUR' },
  { label: 'US Dollar ($)', value: 'USD' },
  { label: 'British Pound (£)', value: 'GBP' },
]
const COLOUR_CHIPS = [
  { key: 'red', label: 'Red' },
  { key: 'white', label: 'White' },
  { key: 'sparkling', label: 'Sparkling' },
  { key: 'rose', label: 'Rosé' },
  { key: 'fortified', label: 'Fortified' },
]

export function Onboarding() {
  const s = useStore()
  return (
    <div style={overlay} data-screen-label="Onboarding">
      <div style={panel}>
        {s.obStep === 'auth' && <AuthStep />}
        {s.obStep === 'welcome' && <WelcomeStep />}
        {(s.obStep === 'account' || s.obStep === 'profile' || s.obStep === 'first') && <SteppedFlow />}
      </div>
    </div>
  )
}

function AuthStep() {
  const s = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const signup = s.authMode === 'signup'

  const submit = async () => {
    setErr(null)
    if (!hasSupabase) {
      // Demo mode: no backend configured yet.
      if (signup) s.startOnboarding()
      else s.loadSampleCellar()
      return
    }
    if (!email || !password) {
      setErr('Enter your email and password.')
      return
    }
    setBusy(true)
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        s.setObAccount({})
        if (data.session) s.startOnboarding()
        else setErr('Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // session.ts loads the user's data; reveal the app.
        useStore.setState({ onboarded: true, screen: 'cellar' })
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ margin: 'auto 0', width: '100%' }}>
      <div className="ws-signin">
        <div className="ws-signin__head">
          <Logo variant="stacked" />
          <h1 className="ws-signin__title">{signup ? 'Create your cellar' : 'Welcome back'}</h1>
          <p className="ws-signin__sub">{signup ? 'A private cellar, kept impeccably.' : 'Sign in to your cellar.'}</p>
        </div>
        <div className="ws-signin__form">
          <TextField label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <TextField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signup ? 'new-password' : 'current-password'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
          {err && <div style={{ fontSize: 13, color: 'var(--ws-danger, var(--ws-bordeaux))', lineHeight: 1.4 }}>{err}</div>}
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'One moment…' : signup ? 'Create cellar' : 'Sign in'}
          </Button>
        </div>
        <div className="ws-signin__foot">
          <button onClick={s.toggleAuthMode} style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 14, color: 'var(--ws-muted)' }}>
            {signup ? (
              <>
                Already have a cellar? <span style={{ color: 'var(--ws-bordeaux)', fontWeight: 500 }}>Sign in</span>
              </>
            ) : (
              <>
                New here? <span style={{ color: 'var(--ws-bordeaux)', fontWeight: 500 }}>Create a cellar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function WelcomeStep() {
  const s = useStore()
  return (
    <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-6)', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Logo variant="stacked" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 30, lineHeight: 1.1, margin: '0 0 10px', color: 'var(--ws-ink)' }}>A cellar that knows itself</h1>
        <p style={{ margin: '0 auto', maxWidth: 340, fontSize: 15, lineHeight: 1.55, color: 'var(--ws-muted)' }}>Three quick steps and your collection is set up, then add your first bottle.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)', background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', padding: 'var(--ws-space-5)' }}>
        {[
          { n: 1, t: 'It reads your labels', d: 'Point your camera and WineSnob fills in the vintage, producer and region.' },
          { n: 2, t: 'It tracks every drink window', d: "Know what's ready tonight and what's worth the wait." },
          { n: 3, t: 'It always knows the worth', d: 'A live valuation of your whole collection, by region and vintage.' },
        ].map((row) => (
          <div key={row.n} style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 999, background: 'var(--ws-cream)', color: 'var(--ws-bordeaux)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ws-font-display)', fontSize: 15 }}>{row.n}</span>
            <div>
              <div style={{ fontSize: 15, color: 'var(--ws-ink)', fontWeight: 500 }}>{row.t}</div>
              <div style={{ fontSize: 13.5, color: 'var(--ws-muted)', lineHeight: 1.5, marginTop: 2 }}>{row.d}</div>
            </div>
          </div>
        ))}
      </div>
      <Button variant="primary" onClick={s.obStart}>
        Set up my cellar
      </Button>
    </div>
  )
}

function SteppedFlow() {
  const s = useStore()
  const stepIndex = ({ account: 1, profile: 2, first: 3 } as Record<string, number>)[s.obStep] || 0
  const pct = `${((stepIndex / 3) * 100).toFixed(0)}%`
  const hasNext = s.obStep === 'account' || s.obStep === 'profile'
  const goalStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    alignItems: 'flex-start',
    textAlign: 'left',
    padding: 'var(--ws-space-4)',
    borderRadius: 'var(--ws-radius-md)',
    cursor: 'pointer',
    font: 'inherit',
    background: active ? 'var(--ws-cream)' : 'var(--ws-surface)',
    border: active ? '1.5px solid var(--ws-bordeaux)' : '0.5px solid var(--ws-border)',
    boxShadow: 'var(--ws-shadow-sm)',
    width: '100%',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 'var(--ws-space-6)' }}>
      {/* progress header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)' }}>
        <button onClick={s.obBack} aria-label="Back" style={{ flexShrink: 0, width: 34, height: 34, display: 'grid', placeItems: 'center', background: 'none', border: '0.5px solid var(--ws-border)', borderRadius: 999, cursor: 'pointer', color: 'var(--ws-muted)', fontSize: 16 }}>
          ←
        </button>
        <div style={{ flex: 1, height: 3, background: 'var(--ws-border)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: pct, height: '100%', background: 'var(--ws-bordeaux)', borderRadius: 999, transition: 'width 0.35s ease' }} />
        </div>
        <span style={{ flexShrink: 0, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ws-muted)' }}>{stepIndex ? `Step ${stepIndex} of 3` : ''}</span>
      </div>

      {s.obStep === 'account' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-5)' }}>
          <div>
            <h1 style={stepTitle}>First, the basics</h1>
            <p style={stepSub}>How should we address you, and in what currency?</p>
          </div>
          <TextField label="Your name" placeholder="e.g. Alex Rivera" value={s.obAccount.name} onChange={(e) => s.setObAccount({ name: e.target.value })} />
          <Select label="Currency" options={CURRENCY_OPTIONS} value={s.obAccount.currency} onChange={(e) => s.setObAccount({ currency: e.target.value as Currency })} hint="Used for every valuation" />
          <div>
            <div style={miniLabel}>Show your cellar by</div>
            <SegmentedControl
              options={[
                { key: 'value', label: 'By value' },
                { key: 'bottles', label: 'By bottles' },
              ]}
              value={s.obAccount.measure}
              onChange={(v) => s.setObAccount({ measure: v as 'value' | 'bottles' })}
            />
          </div>
        </div>
      )}

      {s.obStep === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-5)' }}>
          <div>
            <h1 style={stepTitle}>Your cellar</h1>
            <p style={stepSub}>A little about how you collect — this tailors what we surface.</p>
          </div>
          <TextField label="Name your cellar" placeholder="e.g. The Cellar Under the Stairs" value={s.obProfile.cellarName} onChange={(e) => s.setObProfile({ cellarName: e.target.value })} />
          <div>
            <div style={miniLabel}>Wines you favour</div>
            <FilterChips options={COLOUR_CHIPS} selected={s.obProfile.colours} onToggle={s.toggleObColour} />
          </div>
          <div>
            <div style={miniLabel}>Your collecting style</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--ws-space-3)' }}>
              <button onClick={() => s.setObProfile({ goal: 'drink' })} style={goalStyle(s.obProfile.goal === 'drink')}>
                <div style={goalTitle}>Drink soon</div>
                <div style={goalDesc}>Bottles I want to open and enjoy.</div>
              </button>
              <button onClick={() => s.setObProfile({ goal: 'invest' })} style={goalStyle(s.obProfile.goal === 'invest')}>
                <div style={goalTitle}>Invest &amp; age</div>
                <div style={goalDesc}>Cellaring for the long view.</div>
              </button>
              <button onClick={() => s.setObProfile({ goal: 'both' })} style={goalStyle(s.obProfile.goal === 'both')}>
                <div style={goalTitle}>A bit of both</div>
                <div style={goalDesc}>Some to enjoy, some to keep.</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {s.obStep === 'first' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-5)' }}>
          <div>
            <h1 style={stepTitle}>Add your first bottle</h1>
            <p style={stepSub}>However you like — you can always add more later.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
            <MethodCard title="Snap a label" desc="Point your camera and we read it for you." onClick={() => s.finishOnboarding('snap')} glyph="◉" />
            <MethodCard title="Enter by hand" desc="Type the wine in yourself." onClick={() => s.finishOnboarding('manual')} glyph="✎" />
            <MethodCard title="Import a list" desc="Bring in a spreadsheet or merchant order." onClick={() => s.finishOnboarding('import')} glyph="≡" />
          </div>
          <button className="ws-linkish" onClick={() => s.finishOnboarding('later')} style={{ alignSelf: 'center', background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 14, padding: 6 }}>
            I'll do this later
          </button>
        </div>
      )}

      {hasNext && (
        <div style={{ marginTop: 'auto', paddingTop: 'var(--ws-space-4)' }}>
          <Button variant="primary" onClick={s.obNext}>
            Continue
          </Button>
        </div>
      )}
    </div>
  )
}

function MethodCard({ title, desc, onClick, glyph }: { title: string; desc: string; onClick: () => void; glyph: string }) {
  return (
    <button className="ws-hairline-btn" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)', textAlign: 'left', background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', padding: 'var(--ws-space-5)', cursor: 'pointer', font: 'inherit' }}>
      <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 999, background: 'var(--ws-cream)', color: 'var(--ws-bordeaux)', display: 'grid', placeItems: 'center', fontSize: 18 }}>{glyph}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 18, color: 'var(--ws-ink)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--ws-muted)', lineHeight: 1.45, marginTop: 2 }}>{desc}</div>
      </div>
      <span style={{ fontSize: 18, color: 'var(--ws-muted)', flexShrink: 0 }}>→</span>
    </button>
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
  padding: 'var(--ws-space-6) var(--ws-space-5) var(--ws-space-7)',
  display: 'flex',
  flexDirection: 'column',
}
const stepTitle: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 27, lineHeight: 1.1, margin: '0 0 6px', color: 'var(--ws-ink)' }
const stepSub: React.CSSProperties = { margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--ws-muted)' }
const miniLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 12 }
const goalTitle: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontSize: 16, color: 'var(--ws-ink)', whiteSpace: 'nowrap' }
const goalDesc: React.CSSProperties = { fontSize: 12.5, color: 'var(--ws-muted)', lineHeight: 1.45, marginTop: 5 }
