import { useState } from 'react'
import { Button, Logo, TextField } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'

/** Shown when a password-recovery link opens the app: the link has already
 * signed the user in, so all that remains is choosing the new password. */
export function ResetPassword() {
  const clear = useStore((s) => s.clearPwRecovery)
  const flash = useStore((s) => s.flash)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    if (pw.length < 8) {
      setErr('Use at least 8 characters.')
      return
    }
    if (pw !== pw2) {
      setErr('The passwords do not match.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      flash('Your password is updated. Welcome back.', 3600)
      clear()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update the password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={panel}>
        <div className="ws-signin" style={{ alignSelf: 'center' }}>
          <div className="ws-signin__head">
            <Logo variant="stacked" />
            <h1 className="ws-signin__title">Choose a new password</h1>
            <p className="ws-signin__sub">You followed a reset link, so set it fresh here.</p>
          </div>
          <div className="ws-signin__form">
            <TextField label="New password" type="password" placeholder="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            <TextField
              label="Repeat it"
              type="password"
              placeholder="Same again"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save()
              }}
            />
            {err && <div style={{ fontSize: 13, color: 'var(--ws-bordeaux)', lineHeight: 1.45 }}>{err}</div>}
            <Button variant="primary" onClick={() => void save()} disabled={busy}>
              {busy ? 'Saving…' : 'Save new password'}
            </Button>
          </div>
          <div className="ws-signin__foot">
            <button onClick={clear} style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 14, color: 'var(--ws-muted)' }}>
              Keep my current password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 320,
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
  justifyContent: 'center',
}
