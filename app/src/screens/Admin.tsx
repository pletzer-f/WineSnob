import { useEffect, useState } from 'react'
import { Button, Logo, Tag, TextField } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { hasSupabase, supabase } from '@/lib/supabase'
import { adminCall, fnLabel, generatePassword, statementNumber, type AdminOverview, type AdminUser, type BillingStatement, type CreditDetail, type UsageDetail, type WhoAmI } from '@/data/admin'

type Step = 'checking' | 'auth' | 'denied' | 'dash' | 'unavailable'

/** The admin console: sign in as an administrator, then manage accounts,
 * see each user's footprint, and their AI cost. Renders above everything. */
export function Admin() {
  const close = useStore((s) => s.closeAdmin)
  const flash = useStore((s) => s.flash)

  const [step, setStep] = useState<Step>('checking')
  const [me, setMe] = useState<WhoAmI | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [ov, ul] = await Promise.all([adminCall<AdminOverview>('overview'), adminCall<{ users: AdminUser[] }>('listUsers')])
      setOverview(ov)
      setUsers(ul.users)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load the console')
    } finally {
      setLoading(false)
    }
  }

  const gate = async () => {
    try {
      const who = await adminCall<WhoAmI>('whoami')
      setMe(who)
      if (who.admin) {
        setStep('dash')
        void load()
      } else {
        setStep('denied')
      }
    } catch {
      setStep('auth')
    }
  }

  useEffect(() => {
    if (!hasSupabase) {
      // Offline demo: a mock console with a working billing ledger.
      setMe({ id: 'demo-owner', email: 'owner@winesnob.app', admin: true })
      setStep('dash')
      void load()
      return
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void gate()
      else setStep('auth')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = async () => {
    if (!email || !password) {
      setErr('Enter your email and password.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await gate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={panel}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={kicker}>WineSnob administration{hasSupabase ? '' : ' · demo data'}</div>
            <h1 style={h1}>Admin</h1>
          </div>
          {step === 'dash' && (
            <button className="ws-linkish" onClick={() => void load()} style={linkBtn} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
          <button className="ws-modal__close" aria-label="Close" onClick={close}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </header>

        {step === 'checking' && <div style={{ color: 'var(--ws-muted)', fontSize: 14 }}>One moment…</div>}

        {step === 'unavailable' && (
          <div style={{ color: 'var(--ws-muted)', fontSize: 14.5, lineHeight: 1.6 }}>
            The admin console needs the live backend and is not available in the offline demo.
          </div>
        )}

        {step === 'auth' && (
          <div className="ws-signin" style={{ alignSelf: 'center' }}>
            <div className="ws-signin__head">
              <Logo variant="stacked" />
              <h2 className="ws-signin__title">Administrator</h2>
              <p className="ws-signin__sub">Sign in with an admin account.</p>
            </div>
            <div className="ws-signin__form">
              <TextField label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <TextField
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void signIn()
                }}
              />
              {err && <div style={errText}>{err}</div>}
              <Button variant="primary" onClick={() => void signIn()} disabled={busy}>
                {busy ? 'One moment…' : 'Sign in'}
              </Button>
            </div>
          </div>
        )}

        {step === 'denied' && (
          <div style={{ color: 'var(--ws-ink)', fontSize: 14.5, lineHeight: 1.6 }}>
            {me?.email ? `${me.email} has no admin access.` : 'This account has no admin access.'}{' '}
            <button className="ws-linkish ws-linkish--accent" onClick={close} style={linkBtn}>
              Back to the app
            </button>
          </div>
        )}

        {step === 'dash' && (
          <>
            {err && <div style={errText}>{err}</div>}

            {/* overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--ws-space-3)' }}>
              <div style={card}>
                <div style={microLabel}>Users</div>
                <div style={figure}>{overview ? overview.users : '·'}</div>
              </div>
              <div style={card}>
                <div style={microLabel}>Bottles</div>
                <div style={figure}>{overview ? overview.bottles : '·'}</div>
              </div>
              <div style={card}>
                <div style={microLabel}>AI spend · 30d</div>
                <div style={figure}>{overview ? `$${overview.aiSpend30d.toFixed(2)}` : '·'}</div>
              </div>
            </div>

            <CreateUser onCreated={() => void load()} flash={flash} />

            {/* users */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
              <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 20, color: 'var(--ws-ink)', borderBottom: '0.5px solid var(--ws-border)', paddingBottom: 10 }}>
                Accounts <span style={{ fontSize: 13, color: 'var(--ws-muted)', fontFamily: 'var(--ws-font-ui)' }}>{users.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
                {users.map((u) => (
                  <UserRow key={u.id} u={u} self={me?.id === u.id} onChanged={() => void load()} flash={flash} />
                ))}
                {users.length === 0 && !loading && <div style={{ color: 'var(--ws-muted)', fontSize: 14 }}>No accounts yet.</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CreateUser({ onCreated, flash }: { onCreated: () => void; flash: (m: string, ms?: number) => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const create = async () => {
    setBusy(true)
    setErr(null)
    try {
      await adminCall('createUser', { email: email.trim(), password, name: name.trim() })
      flash(`${email.trim()} created. Share the password securely.`, 4200)
      setOpen(false)
      setEmail('')
      setName('')
      setPassword('')
      onCreated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create the account')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        Create a user
      </Button>
    )
  }
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
      <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 18, color: 'var(--ws-ink)' }}>New account</div>
      <TextField label="Email" type="email" placeholder="guest@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Name (optional)" placeholder="e.g. Alex Rivera" value={name} onChange={(e) => setName(e.target.value)} />
      <div>
        <TextField label="Password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} hint="Created accounts are email-confirmed and can sign in immediately." />
        <button className="ws-linkish ws-linkish--accent" onClick={() => setPassword(generatePassword())} style={{ ...linkBtn, marginTop: 6 }}>
          Generate a strong password
        </button>
      </div>
      {err && <div style={errText}>{err}</div>}
      <div className="ws-modal-actions">
        <div className="ws-modal-actions__spacer" />
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => void create()} disabled={busy || !email.trim() || password.length < 8}>
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </div>
    </div>
  )
}

function UserRow({ u, self, onChanged, flash }: { u: AdminUser; self: boolean; onChanged: () => void; flash: (m: string, ms?: number) => void }) {
  const [pwOpen, setPwOpen] = useState(false)
  const [billingOpen, setBillingOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [armed, setArmed] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])

  const emailReset = async () => {
    setBusy(true)
    setErr(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(u.email, { redirectTo: window.location.origin })
      if (error) throw error
      flash(`Reset link emailed to ${u.email}`, 3600)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send the reset email')
    } finally {
      setBusy(false)
    }
  }

  const setPassword = async () => {
    setBusy(true)
    setErr(null)
    try {
      await adminCall('setPassword', { userId: u.id, password: pw })
      flash(`Password updated for ${u.email}`, 3200)
      setPwOpen(false)
      setPw('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not set the password')
    } finally {
      setBusy(false)
    }
  }

  const del = async () => {
    if (!armed) {
      setArmed(true)
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await adminCall('deleteUser', { userId: u.id })
      flash(`${u.email} deleted`, 3200)
      onChanged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete the account')
      setBusy(false)
      setArmed(false)
    }
  }

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)', overflowWrap: 'anywhere' }}>{u.email}</span>
        {u.name && <span style={{ fontSize: 13, color: 'var(--ws-muted)' }}>{u.name}</span>}
        {u.isAdmin && <Tag tone="accent">Admin</Tag>}
        {!u.confirmed && <Tag tone="cellar">Unconfirmed</Tag>}
        <span style={{ marginLeft: 'auto', fontSize: 13.5, fontWeight: 600, color: u.aiCost30d > 0 ? 'var(--ws-ink)' : 'var(--ws-muted)' }}>
          ${u.aiCost30d.toFixed(2)} <span style={{ fontWeight: 400, color: 'var(--ws-muted)' }}>· AI 30d</span>
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ws-muted)', lineHeight: 1.6 }}>
        Joined {u.createdAt} · last seen {u.lastSignIn || 'never'} · {u.onboarded ? 'onboarded' : 'not onboarded'} · {u.bottles}{' '}
        {u.bottles === 1 ? 'bottle' : 'bottles'}
        {u.cellarValue > 0 ? ` (~${u.cellarValue.toLocaleString()} ${u.currency})` : ''} · {u.drinks} pours · {u.wishes} wishes · {u.aiCalls30d} AI calls
      </div>

      {pwOpen && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <TextField label="New password" placeholder="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <button className="ws-linkish ws-linkish--accent" onClick={() => setPw(generatePassword())} style={{ ...linkBtn, paddingBottom: 12 }}>
            Generate
          </button>
          <Button variant="primary" size="sm" onClick={() => void setPassword()} disabled={busy || pw.length < 8}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
      {err && <div style={errText}>{err}</div>}

      <div style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center', borderTop: '0.5px solid var(--ws-border)', paddingTop: 10, flexWrap: 'wrap' }}>
        <button className="ws-linkish ws-linkish--accent" onClick={() => setBillingOpen((v) => !v)} style={{ ...linkBtn, color: 'var(--ws-bordeaux)' }}>
          {billingOpen ? 'Close billing' : 'Usage & billing'}
        </button>
        <button className="ws-linkish" onClick={() => setPwOpen((v) => !v)} style={linkBtn}>
          {pwOpen ? 'Close password' : 'Set password'}
        </button>
        <button className="ws-linkish" onClick={() => void emailReset()} style={linkBtn} disabled={busy}>
          Email reset link
        </button>
        <div style={{ flex: 1 }} />
        {self ? (
          <span style={{ fontSize: 12.5, color: 'var(--ws-muted)' }}>This is you</span>
        ) : (
          <button
            className="ws-danger-hover"
            onClick={() => void del()}
            disabled={busy}
            style={{ background: 'none', border: '0.5px solid var(--ws-border)', borderRadius: 999, padding: '6px 13px', font: 'inherit', fontSize: 13, color: armed ? 'var(--ws-cream)' : 'var(--ws-bordeaux)', backgroundColor: armed ? 'var(--ws-bordeaux)' : 'transparent', cursor: 'pointer' }}
          >
            {busy ? 'Deleting…' : armed ? 'Tap again to confirm' : 'Delete user'}
          </button>
        )}
      </div>

      {billingOpen && <BillingPanel userId={u.id} email={u.email} flash={flash} />}
    </div>
  )
}

/** Per-account billing: the outstanding balance with its per-feature
 * breakdown, the settle action, and the locked statement history. */
function BillingPanel({ userId, email, flash }: { userId: string; email: string; flash: (m: string, ms?: number) => void }) {
  const [detail, setDetail] = useState<UsageDetail | null>(null)
  const [statements, setStatements] = useState<BillingStatement[]>([])
  const [credit, setCredit] = useState<CreditDetail | null>(null)
  const [openStmt, setOpenStmt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [armed, setArmed] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setErr(null)
    try {
      const [d, s, c] = await Promise.all([
        adminCall<UsageDetail>('usageDetail', { userId }),
        adminCall<{ statements: BillingStatement[] }>('listStatements', { userId }),
        adminCall<CreditDetail>('creditDetail', { userId }),
      ])
      setDetail(d)
      setStatements(s.statements)
      setCredit(c)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load billing')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])

  const settle = async () => {
    if (!armed) {
      setArmed(true)
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await adminCall<{ statement: BillingStatement }>('settleUser', { userId })
      flash(`${statementNumber(res.statement.seq)} settled: $${Number(res.statement.total_usd).toFixed(2)}`, 4200)
      setOpenStmt(res.statement.id)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not settle')
    } finally {
      setBusy(false)
      setArmed(false)
    }
  }

  const day = (iso?: string | null) => (iso ? String(iso).slice(0, 10) : '')
  const out = detail?.outstanding

  return (
    <div style={{ borderTop: '0.5px solid var(--ws-border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!detail && !err && <div style={{ fontSize: 13, color: 'var(--ws-muted)' }}>Loading usage…</div>}
      {err && <div style={errText}>{err}</div>}

      {credit && <CreditBlock userId={userId} email={email} credit={credit} onChanged={() => void load()} flash={flash} />}

      {detail && out && (
        <div style={{ background: 'var(--ws-alabaster)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-md)', padding: 'var(--ws-space-4)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={microLabel}>Outstanding since last statement</div>
              <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 27, lineHeight: 1, color: 'var(--ws-ink)' }}>${out.totalUsd.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'var(--ws-muted)', marginTop: 4 }}>
                {out.calls === 0 ? 'No unbilled usage' : `${out.calls} calls · ${day(out.since)} to ${day(out.until)}`}
                {detail.lastStatement ? ` · previous: ${statementNumber(detail.lastStatement.seq)} on ${day(detail.lastStatement.created_at)}` : ''}
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={() => void settle()} disabled={busy || out.calls === 0}>
              {busy ? 'Settling…' : armed ? `Confirm: settle $${out.totalUsd.toFixed(2)}` : 'Settle now'}
            </Button>
          </div>

          {detail.lines.length > 0 && (
            <div style={{ borderTop: '0.5px solid var(--ws-border)', paddingTop: 8 }}>
              {detail.lines.map((l) => (
                <div key={l.fn} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '5px 0', fontSize: 13.5 }}>
                  <span style={{ color: 'var(--ws-ink)' }}>{fnLabel(l.fn)}</span>
                  <span style={{ fontSize: 12, color: 'var(--ws-muted)' }}>
                    {l.calls} {l.calls === 1 ? 'call' : 'calls'}
                    {l.searches > 0 ? ` · ${l.searches} searches` : ''}
                  </span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--ws-ink)' }}>${l.usd.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {statements.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={microLabel}>Statements · locked</div>
          {statements.map((s) => (
            <div key={s.id}>
              <button
                className="ws-linkish"
                onClick={() => setOpenStmt(openStmt === s.id ? null : s.id)}
                style={{ ...linkBtn, width: '100%', display: 'flex', gap: 10, alignItems: 'baseline', textAlign: 'left', padding: '6px 0' }}
              >
                <span style={{ fontWeight: 600, color: 'var(--ws-ink)' }}>{statementNumber(s.seq)}</span>
                <span style={{ fontSize: 12.5, color: 'var(--ws-muted)' }}>
                  {day(s.period_start)} to {day(s.period_end)} · {s.calls} calls
                </span>
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--ws-ink)' }}>${Number(s.total_usd).toFixed(2)}</span>
                <span style={{ fontSize: 12, color: 'var(--ws-muted)' }}>{openStmt === s.id ? '▴' : '▾'}</span>
              </button>
              {openStmt === s.id && <StatementCard s={s} email={email} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Prepaid credits: the live balance, manual grants, and the locked ledger.
 * Every grant is confirmed once in a small dialog before it is written. */
function CreditBlock({ userId, email, credit, onChanged, flash }: { userId: string; email: string; credit: CreditDetail; onChanged: () => void; flash: (m: string, ms?: number) => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ledgerOpen, setLedgerOpen] = useState(false)

  const value = Number(amount)
  const valid = Number.isFinite(value) && value !== 0 && Math.abs(value) <= 500

  const askToGrant = () => {
    if (!valid) {
      setErr('Enter an amount, e.g. 25 (or negative to correct).')
      return
    }
    setErr(null)
    setConfirming(true)
  }

  const grant = async () => {
    setConfirming(false)
    setBusy(true)
    setErr(null)
    try {
      const res = await adminCall<{ balance: number }>('grantCredits', { userId, amountUsd: value, note: note.trim() || undefined })
      flash(`${value > 0 ? '+' : ''}$${value.toFixed(2)} granted. Balance: $${res.balance.toFixed(2)}`, 3800)
      setAmount('')
      setNote('')
      onChanged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not grant credits')
    } finally {
      setBusy(false)
    }
  }

  const day = (iso: string) => iso.slice(0, 10)
  const low = credit.balance < 0

  return (
    <div style={{ background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-md)', padding: 'var(--ws-space-4)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={microLabel}>Credit balance</div>
          <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 24, lineHeight: 1, color: low ? 'var(--ws-bordeaux)' : 'var(--ws-ink)' }}>
            ${credit.balance.toFixed(2)}
          </div>
        </div>
        {credit.balance < -10 && <Tag tone="accent">AI paused</Tag>}
        {low && credit.balance >= -10 && <Tag tone="cellar">Overdrawn</Tag>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ width: 110 }}>
          <TextField label="Amount $" placeholder="25" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <TextField label="Note (optional)" placeholder="e.g. Paid by bank transfer" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button variant="primary" size="sm" onClick={askToGrant} disabled={busy}>
          {busy ? 'Granting…' : 'Grant'}
        </Button>
      </div>
      {err && <div style={errText}>{err}</div>}

      {confirming && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 310, background: 'rgba(31, 27, 24, 0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--ws-space-5)' }} onClick={() => setConfirming(false)}>
          <div style={{ background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow)', padding: 'var(--ws-space-5)', width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 19, color: 'var(--ws-ink)' }}>
              {value > 0 ? 'Grant credit?' : 'Apply correction?'}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ws-ink)' }}>
              {value > 0 ? 'Grant ' : 'Deduct '}
              <strong>${Math.abs(value).toFixed(2)}</strong>
              {value > 0 ? ' to ' : ' from '}
              <span style={{ overflowWrap: 'anywhere' }}>{email}</span>.
              {note.trim() ? ` Note: ${note.trim()}` : ''}
              {' '}The ledger is permanent; a mistake is corrected with a new entry, never undone.
            </div>
            <div className="ws-modal-actions">
              <div className="ws-modal-actions__spacer" />
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void grant()}>
                {value > 0 ? `Grant $${Math.abs(value).toFixed(2)}` : `Deduct $${Math.abs(value).toFixed(2)}`}
              </Button>
            </div>
          </div>
        </div>
      )}
      {credit.entries.length > 0 && (
        <div>
          <button className="ws-linkish" onClick={() => setLedgerOpen((v) => !v)} style={{ ...linkBtn, fontSize: 12.5 }}>
            {ledgerOpen ? 'Hide ledger' : `Ledger · ${credit.entries.length} entries`}
          </button>
          {ledgerOpen && (
            <div style={{ borderTop: '0.5px solid var(--ws-border)', marginTop: 6 }}>
              {credit.entries.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 0', fontSize: 12.5, borderBottom: '0.5px solid var(--ws-border)' }}>
                  <span style={{ color: 'var(--ws-muted)' }}>{day(e.created_at)}</span>
                  <span style={{ color: 'var(--ws-ink)' }}>{e.kind === 'usage' ? fnLabel(e.note || '') || 'Usage' : e.note || (e.kind === 'grant' ? 'Grant' : 'Adjustment')}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600, color: e.delta_usd < 0 ? 'var(--ws-bordeaux)' : 'var(--ws-green, #2f5d3a)' }}>
                    {e.delta_usd > 0 ? '+' : ''}${e.delta_usd.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** The unofficial invoice: a locked usage statement, presented properly. */
function StatementCard({ s, email }: { s: BillingStatement; email: string }) {
  const day = (iso?: string | null) => (iso ? String(iso).slice(0, 10) : '')
  return (
    <div style={{ background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border-strong)', borderRadius: 'var(--ws-radius-md)', padding: 'var(--ws-space-5)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--ws-font-display)', letterSpacing: '0.3em', fontSize: 14, color: 'var(--ws-ink)' }}>WINE&nbsp;SNOB</span>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ws-bordeaux)' }}>
          Usage statement · {statementNumber(s.seq)}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ws-muted)', lineHeight: 1.6 }}>
        Billed to <span style={{ color: 'var(--ws-ink)' }}>{s.user_email || email}</span>
        <br />
        Period {day(s.period_start)} to {day(s.period_end)}
        {s.note ? (
          <>
            <br />
            {s.note}
          </>
        ) : null}
      </div>
      <div style={{ borderTop: '0.5px solid var(--ws-border)' }}>
        {(s.lines || []).map((l) => (
          <div key={l.fn} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '7px 0', borderBottom: '0.5px solid var(--ws-border)', fontSize: 13.5 }}>
            <span style={{ color: 'var(--ws-ink)' }}>{fnLabel(l.fn)}</span>
            <span style={{ fontSize: 12, color: 'var(--ws-muted)' }}>
              {l.calls} {l.calls === 1 ? 'call' : 'calls'}
              {l.searches > 0 ? ` · ${l.searches} searches` : ''}
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--ws-ink)' }}>${Number(l.usd).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '9px 0' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ws-muted)' }}>Total</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--ws-font-display)', fontSize: 20, color: 'var(--ws-ink)' }}>${Number(s.total_usd).toFixed(2)}</span>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ws-muted)' }}>
        Settled {day(s.created_at)} · locked · an informal usage statement, not a tax invoice
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  background: 'var(--ws-bg)',
  overflowY: 'auto',
  display: 'flex',
  justifyContent: 'center',
  fontFamily: 'var(--ws-font-ui)',
  color: 'var(--ws-ink)',
}
const panel: React.CSSProperties = {
  width: '100%',
  maxWidth: 760,
  minHeight: '100%',
  boxSizing: 'border-box',
  padding: 'var(--ws-space-6) var(--ws-space-5) var(--ws-space-7)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--ws-space-5)',
}
const kicker: React.CSSProperties = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 7 }
const h1: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 30, lineHeight: 1, margin: 0, color: 'var(--ws-ink)' }
const card: React.CSSProperties = {
  background: 'var(--ws-surface)',
  border: '0.5px solid var(--ws-border)',
  borderRadius: 'var(--ws-radius-lg)',
  boxShadow: 'var(--ws-shadow-sm)',
  padding: 'var(--ws-space-4) var(--ws-space-5)',
}
const microLabel: React.CSSProperties = { fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 5 }
const figure: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontSize: 24, lineHeight: 1.05, color: 'var(--ws-ink)' }
const linkBtn: React.CSSProperties = { background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13.5, padding: '4px 0' }
const errText: React.CSSProperties = { fontSize: 13, color: 'var(--ws-bordeaux)', lineHeight: 1.45 }
