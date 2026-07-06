import { useEffect, useRef, useState } from 'react'
import { Button, Logo, TextField } from 'winesnob-design-system'
import { canPromptInstall, isIOS, isStandalone, onInstallChange, promptInstall } from '@/lib/pwa'
import { hasSupabase, supabase } from '@/lib/supabase'
import { useStore } from '@/store/store'

type Step = 'intro' | 'join' | 'confirm' | 'install'

/**
 * The front door: a three-act journey. Act one introduces WineSnob like a
 * proper website; act two creates the account against the live backend; act
 * three puts the app on the phone. `onDone` hands over to the app itself.
 */
export function Landing({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>('intro')
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')

  const begin = (m: 'signup' | 'signin') => {
    setMode(m)
    setStep('join')
  }

  return (
    <div className="ws-land" id="ws-land-scroll">
      {step === 'intro' && <Intro onBegin={begin} onSkip={onDone} />}
      {step === 'join' && <Join mode={mode} setMode={setMode} onBack={() => setStep('intro')} onConfirmNeeded={() => setStep('confirm')} onJoined={() => setStep('install')} />}
      {step === 'confirm' && <Confirm onBack={() => setStep('join')} onConfirmed={() => setStep('install')} />}
      {step === 'install' && <Install onEnter={onDone} />}
    </div>
  )
}

/* ------------------------------------------------------------------ act I */

function Intro({ onBegin, onSkip }: { onBegin: (m: 'signup' | 'signin') => void; onSkip: () => void }) {
  const [barOn, setBarOn] = useState(false)

  // Scroll-reveal: scenes rise into place as they enter the viewport.
  useEffect(() => {
    const root = document.getElementById('ws-land-scroll')
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-in')),
      { root, threshold: 0.18 },
    )
    root.querySelectorAll('.ws-reveal').forEach((el) => io.observe(el))
    const onScroll = () => setBarOn(root.scrollTop > root.clientHeight * 0.55)
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      root.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <>
      {/* slim bar that fades in once the hero has scrolled away */}
      <div className={`ws-land-bar${barOn ? ' ws-land-bar--on' : ''}`}>
        <Logo variant="horizontal" />
        <div style={{ flex: 1 }} />
        <button className="ws-linkish" style={barLink} onClick={() => onBegin('signin')}>
          Sign in
        </button>
        <Button variant="primary" size="sm" onClick={() => onBegin('signup')}>
          Create your cellar
        </Button>
      </div>

      {/* hero */}
      <section className="ws-land-hero">
        <div className="ws-stagger ws-land-hero__inner">
          <Logo variant="stacked" />
          <div>
            <div className="ws-land-kicker">The private cellar, kept impeccably</div>
            <h1 className="ws-land-h1">
              A cellar that
              <br />
              knows itself.
            </h1>
            <p className="ws-land-sub">
              WineSnob catalogues, values and serves your collection. It reads labels, prices every bottle from the
              live market, and advises like a sommelier. On your phone, like a native app.
            </p>
          </div>
          <div className="ws-land-ctas">
            <Button variant="primary" onClick={() => onBegin('signup')}>
              Create your cellar
            </Button>
            <button className="ws-linkish" style={heroLink} onClick={() => onBegin('signin')}>
              I already have one
            </button>
          </div>
          <div className="ws-land-scrolldown" aria-hidden="true">
            <span>Discover</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v16M5 13l7 7 7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* scene: label reader */}
      <Scene n="01" kicker="The label reader" title="Point. It knows." body="Photograph any label, or a whole case, and WineSnob writes the entry itself: producer, vintage, region and a market value, filed to your cellar in seconds.">
        <MockScan />
      </Scene>

      {/* scene: sommelier */}
      <Scene n="02" kicker="The sommelier" title="Ask, as you would a friend." body="Tonight's dish, a photo of the menu, or simply a mood. Your sommelier answers from the bottles you actually own, tells you how to serve it, and hands you the line to say at the table." flip>
        <MockSommelier />
      </Scene>

      {/* scene: portfolio */}
      <Scene n="03" kicker="The portfolio" title="Broker clarity for the cellar." body="Live market pricing from real listings, a value history from the day you join, movers, allocation and a drink-window ladder. Your collection, read like a private bank statement.">
        <MockPortfolio />
      </Scene>

      {/* closing invitation */}
      <section className="ws-land-close">
        <div className="ws-reveal">
          <div className="ws-land-kicker">Three minutes to set up</div>
          <h2 className="ws-land-h2">Bring your cellar in.</h2>
          <p className="ws-land-sub" style={{ margin: '0 auto', maxWidth: 400 }}>
            Create your account, put WineSnob on your phone, and photograph your first label tonight.
          </p>
          <div style={{ marginTop: 26 }}>
            <Button variant="primary" onClick={() => onBegin('signup')}>
              Create your cellar
            </Button>
          </div>
        </div>

        <footer className="ws-land-foot">
          <button className="ws-linkish" style={footLink} onClick={onSkip}>
            Skip the tour, enter in the browser →
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
            <span style={{ fontSize: 11.5, letterSpacing: '0.12em', color: 'var(--ws-taupe)', textTransform: 'uppercase' }}>WineSnob · MMXXVI</span>
            <button className="ws-linkish" style={{ ...footLink, fontSize: 12, color: 'var(--ws-taupe)' }} onClick={() => useStore.getState().openAdmin()}>
              Log in as Admin
            </button>
          </div>
        </footer>
      </section>
    </>
  )
}

function Scene({ n, kicker, title, body, flip, children }: { n: string; kicker: string; title: string; body: string; flip?: boolean; children: React.ReactNode }) {
  return (
    <section className={`ws-land-scene${flip ? ' ws-land-scene--flip' : ''}`}>
      <div className="ws-reveal ws-land-scene__copy">
        <div className="ws-land-n">{n}</div>
        <div className="ws-land-kicker">{kicker}</div>
        <h2 className="ws-land-h2">{title}</h2>
        <p className="ws-land-body">{body}</p>
      </div>
      <div className="ws-reveal ws-land-scene__art">{children}</div>
    </section>
  )
}

/* ---- scene artwork: real UI, composed as vignettes ---- */

function MockScan() {
  return (
    <div className="ws-land-mock">
      <div className="ws-land-chip">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
          <circle cx="12" cy="13.5" r="3.4" />
        </svg>
        Label read
      </div>
      <div className="ws-bottle" style={{ minWidth: 0, boxShadow: 'var(--ws-shadow)' }}>
        <span className="ws-bottle__spine" />
        <div className="ws-bottle__body">
          <div className="ws-bottle__head">
            <div>
              <h3 className="ws-bottle__name">Barolo Monfortino Riserva</h3>
              <p className="ws-bottle__producer">Giacomo Conterno</p>
            </div>
            <div className="ws-bottle__vintage">2017</div>
          </div>
          <div className="ws-bottle__meta">
            <div className="ws-bottle__meta-item">
              <span className="ws-bottle__meta-label">Region</span>
              <span className="ws-bottle__meta-value">Piedmont</span>
            </div>
            <div className="ws-bottle__meta-item">
              <span className="ws-bottle__meta-label">Value</span>
              <span className="ws-bottle__meta-value">€2,576</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockSommelier() {
  return (
    <div className="ws-land-mock">
      <div className="ws-som-bubble" style={{ alignSelf: 'flex-end', maxWidth: '88%' }}>
        Duck ragù with pappardelle, four of us. What should we open?
      </div>
      <div className="ws-som-pick ws-som-pick--top" style={{ textAlign: 'left' }}>
        <div className="ws-som-pick-role">The pour</div>
        <div className="ws-som-pick-name">
          Brunello di Montalcino <span className="ws-som-pick-vintage">2016</span>
        </div>
        <div className="ws-som-pick-serve">
          <span>Serve</span> 16-18C, decant 1 hour
        </div>
        <div className="ws-som-say">
          <div className="ws-som-say-label">Say this at the table</div>
          <div className="ws-som-say-line">“Biondi-Santi is the founding estate of Brunello, and this 2016 has the acidity slow-cooked duck asks for.”</div>
        </div>
      </div>
    </div>
  )
}

function MockPortfolio() {
  return (
    <div className="ws-land-mock ws-land-mock--folio">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ws-muted)' }}>Portfolio value</div>
          <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 30, color: 'var(--ws-ink)', lineHeight: 1.05, marginTop: 4 }}>€127,400</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ws-green)', marginTop: 5 }}>+€9,620 (+8.2%) · 1Y</div>
        </div>
        <div className="ws-folio-ranges" style={{ transform: 'scale(0.86)', transformOrigin: 'top right' }}>
          <span className="ws-folio-range">6M</span>
          <span className="ws-folio-range ws-folio-range--on">1Y</span>
          <span className="ws-folio-range">Max</span>
        </div>
      </div>
      <svg viewBox="0 0 100 34" preserveAspectRatio="none" style={{ width: '100%', height: 74, overflow: 'visible' }} aria-hidden="true">
        <polyline
          points="0,28 9,26 18,27 27,23 36,24 45,20 54,21 63,16 72,17 81,12 90,10 100,6"
          fill="none"
          stroke="var(--ws-green)"
          strokeWidth="0.9"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx="100" cy="6" r="1.6" fill="var(--ws-green)" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderTop: '0.5px solid var(--ws-border)', paddingTop: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--ws-muted)' }}>Bordeaux 46%</span>
        <span style={{ fontSize: 12, color: 'var(--ws-muted)' }}>Piedmont 27%</span>
        <span style={{ fontSize: 12, color: 'var(--ws-green)', fontWeight: 600 }}>Margaux +307%</span>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- act II */

function StepHead({ act, title, sub, onBack }: { act: string; title: string; sub: string; onBack?: () => void }) {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      {onBack && (
        <button className="ws-linkish" onClick={onBack} style={{ ...footLink, alignSelf: 'flex-start', position: 'absolute', top: 18, left: 18 }}>
          ← Back
        </button>
      )}
      <Logo variant="stacked" />
      <div className="ws-land-acts">{act}</div>
      <h1 className="ws-land-h2" style={{ margin: 0 }}>
        {title}
      </h1>
      <p className="ws-land-sub" style={{ margin: 0, maxWidth: 360 }}>
        {sub}
      </p>
    </div>
  )
}

function Join({ mode, setMode, onBack, onConfirmNeeded, onJoined }: { mode: 'signup' | 'signin'; setMode: (m: 'signup' | 'signin') => void; onBack: () => void; onConfirmNeeded: () => void; onJoined: () => void }) {
  const s = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const signup = mode === 'signup'

  const submit = async () => {
    setErr(null)
    if (!hasSupabase) {
      // Demo: walk the same journey without a backend.
      if (signup) s.startOnboarding()
      else s.loadSampleCellar()
      onJoined()
      return
    }
    if (!email || !password) {
      setErr('Enter your email and password.')
      return
    }
    setBusy(true)
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        if (data.session) onJoined()
        else {
          sessionStorage.setItem('ws-join-email', email)
          onConfirmNeeded()
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onJoined()
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ws-land-step">
      <div className="ws-stagger ws-land-step__inner">
        <StepHead
          act="Act II · Join"
          title={signup ? 'Create your cellar.' : 'Welcome back.'}
          sub={signup ? 'One account, every device. Your collection stays private to you.' : 'Sign in and carry on where you left off.'}
          onBack={onBack}
        />
        <div className="ws-signin" style={{ boxShadow: 'var(--ws-shadow)' }}>
          <div className="ws-signin__form">
            <TextField label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <TextField
              label="Password"
              type="password"
              placeholder={signup ? 'At least 8 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={signup ? 'new-password' : 'current-password'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit()
              }}
            />
            {err && <div style={errText}>{err}</div>}
            <Button variant="primary" onClick={() => void submit()} disabled={busy}>
              {busy ? 'One moment…' : signup ? 'Create my cellar' : 'Sign in'}
            </Button>
          </div>
          <div className="ws-signin__foot">
            <button onClick={() => setMode(signup ? 'signin' : 'signup')} style={switchLink}>
              {signup ? (
                <>
                  Already a member? <span style={{ color: 'var(--ws-bordeaux)', fontWeight: 500 }}>Sign in</span>
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
    </section>
  )
}

function Confirm({ onBack, onConfirmed }: { onBack: () => void; onConfirmed: () => void }) {
  const email = sessionStorage.getItem('ws-join-email') || 'your inbox'
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const resend = async () => {
    setBusy(true)
    try {
      const to = sessionStorage.getItem('ws-join-email')
      if (to) await supabase.auth.resend({ type: 'signup', email: to })
      setNote('Sent again. Give it a minute.')
    } catch {
      setNote('Could not resend just now.')
    } finally {
      setBusy(false)
    }
  }

  const check = async () => {
    setBusy(true)
    setNote(null)
    const { data } = await supabase.auth.getSession()
    setBusy(false)
    if (data.session) onConfirmed()
    else setNote('Not confirmed yet. Tap the link in the email first, then return here.')
  }

  return (
    <section className="ws-land-step">
      <div className="ws-stagger ws-land-step__inner">
        <StepHead act="Act II · Confirm" title="One tap in your inbox." sub={`We sent a confirmation to ${email}. Tap the link inside, then come back here.`} onBack={onBack} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <Button variant="primary" onClick={() => void check()} disabled={busy}>
            {busy ? 'Checking…' : 'I have confirmed'}
          </Button>
          <button className="ws-linkish" onClick={() => void resend()} style={footLink} disabled={busy}>
            Resend the email
          </button>
          {note && <div style={{ ...errText, color: 'var(--ws-muted)', textAlign: 'center' }}>{note}</div>}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- act III */

function Install({ onEnter }: { onEnter: () => void }) {
  const [canInstall, setCanInstall] = useState(canPromptInstall())
  const [busy, setBusy] = useState(false)
  const ios = isIOS()
  const installed = isStandalone()

  useEffect(() => onInstallChange(() => setCanInstall(canPromptInstall())), [])

  const install = async () => {
    setBusy(true)
    await promptInstall()
    setBusy(false)
  }

  return (
    <section className="ws-land-step">
      <div className="ws-stagger ws-land-step__inner">
        <StepHead act="Act III · Install" title="Put it in your pocket." sub="WineSnob lives on your home screen and opens like a native app. One last step." />

        {installed ? (
          <div style={installedNote}>Already installed. You are reading this from the app itself.</div>
        ) : canInstall ? (
          <Button variant="primary" onClick={() => void install()} disabled={busy}>
            {busy ? 'One moment…' : 'Add WineSnob to this device'}
          </Button>
        ) : ios ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--ws-cream)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', padding: 'var(--ws-space-5)', textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)' }}>Add to your Home Screen</div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6, color: 'var(--ws-ink)' }}>
              <li>
                Tap the Share button{' '}
                <span style={{ display: 'inline-flex', verticalAlign: 'middle', color: 'var(--ws-bordeaux)' }}>
                  <ShareGlyph />
                </span>{' '}
                in Safari's toolbar.
              </li>
              <li>
                Choose <strong style={{ fontWeight: 600 }}>Add to Home Screen</strong>, then tap Add.
              </li>
              <li>Open WineSnob from your Home Screen.</li>
            </ol>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ws-muted)', textAlign: 'center', padding: '0 var(--ws-space-4)' }}>
            On your phone, open this page and tap the browser's Share icon, then <strong style={{ color: 'var(--ws-ink)', fontWeight: 600 }}>Add to Home Screen</strong>. In desktop Chrome or Edge, use the install icon at the right of the address bar.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <Button variant={installed || canInstall ? 'secondary' : 'primary'} onClick={onEnter}>
            Enter WineSnob →
          </Button>
          <span style={{ fontSize: 12.5, color: 'var(--ws-muted)' }}>You can always install later from this page.</span>
        </div>
      </div>
    </section>
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

/* ------------------------------------------------------------------ bits */

const barLink: React.CSSProperties = { background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13.5, padding: '6px 4px', whiteSpace: 'nowrap' }
const heroLink: React.CSSProperties = { background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 14, padding: 8 }
const footLink: React.CSSProperties = { background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13.5, padding: 4 }
const switchLink: React.CSSProperties = { background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 14, color: 'var(--ws-muted)' }
const errText: React.CSSProperties = { fontSize: 13, color: 'var(--ws-bordeaux)', lineHeight: 1.45 }
const installedNote: React.CSSProperties = { fontSize: 14, color: 'var(--ws-green)', textAlign: 'center' }
