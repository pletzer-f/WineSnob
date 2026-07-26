import { useEffect, useMemo, useState } from 'react'
import { Button, Tag, TextField } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { hasSupabase } from '@/lib/supabase'
import {
  attestationNumber,
  fetchAttestationDetail,
  fetchInsuranceEntitled,
  insuranceStatus,
  listAttestations,
  sealInventory,
  type Attestation,
} from '@/data/insurance'
import {
  exportInsuranceWorkbook,
  exportSealedWorkbook,
  printInsuranceStatement,
  printSealedStatement,
  type InsuranceInput,
} from '@/data/exporter'
import { unitValueNow } from '@/domain/valuation'

const eur = (n: number) => `€${Math.round(n).toLocaleString('en-US')}`
const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : '')

/** The insurance hub: declared cover against the living cellar value,
 * per-item limit checks, sealed inventory records, and the documents a
 * broker actually asks for. Admin-granted; renders above the app. */
export function Insurance() {
  const s = useStore()
  const close = useStore((st) => st.closeInsurance)
  const policy = s.policy

  const [entitled, setEntitled] = useState<boolean | null>(hasSupabase ? null : true)
  const [atts, setAtts] = useState<Attestation[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [sealConfirm, setSealConfirm] = useState(false)
  const [sealBusy, setSealBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    void fetchInsuranceEntitled().then(setEntitled)
    listAttestations()
      .then(setAtts)
      .catch(() => setAtts([]))
  }, [])

  const st = useMemo(() => insuranceStatus(s.bottles, policy), [s.bottles, policy])

  // Policy draft: edited locally, saved to the profile in one gesture.
  const [draft, setDraft] = useState({
    insurer: policy?.insurer || '',
    declared: policy?.declared != null ? String(policy.declared) : '',
    itemLimit: policy?.itemLimit != null ? String(policy.itemLimit) : '',
    renewal: policy?.renewal || '',
  })
  const savePolicy = () => {
    const num = (v: string) => {
      const n = Number(String(v).replace(/[^\d.]/g, ''))
      return Number.isFinite(n) && n > 0 ? n : null
    }
    s.setPolicy({
      insurer: draft.insurer.trim(),
      declared: num(draft.declared),
      itemLimit: num(draft.itemLimit),
      renewal: draft.renewal || null,
    })
    s.flash('Policy details saved')
  }

  const seal = async () => {
    setSealBusy(true)
    setErr(null)
    try {
      const a = await sealInventory(note.trim() || undefined)
      setAtts((prev) => [a, ...prev])
      setSealConfirm(false)
      setNote('')
      s.flash(`Inventory sealed as ${attestationNumber(a.seq)}`, 3600)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not seal the inventory')
    } finally {
      setSealBusy(false)
    }
  }

  const exportInput = (): InsuranceInput => ({
    cellars: s.cellars,
    bottles: s.bottles,
    drinks: s.drinks,
    wishlist: s.wishlist,
    accountName: s.account.name,
    accountEmail: s.account.email,
    policy,
    attestation: atts[0] ?? null,
    photoUrl: (b) => {
      if (!b.photo) return undefined
      if (b.photo.startsWith('data:')) return b.photo
      return s.labelUrls[b.photo]?.full
    },
  })

  const downloadWorkbook = async () => {
    setExporting(true)
    try {
      await exportInsuranceWorkbook(exportInput())
      s.flash('Insurance schedule exported')
    } catch {
      s.flash('Export failed, please try again')
    } finally {
      setExporting(false)
    }
  }

  // Retrospective downloads: each sealed record rebuilds its documents from
  // the frozen snapshot alone, never from the living cellar.
  const [docBusy, setDocBusy] = useState<string | null>(null)
  const sealedDoc = async (a: Attestation, kind: 'statement' | 'excel') => {
    setDocBusy(a.id + kind)
    try {
      const detail = await fetchAttestationDetail(a.id)
      if (!detail) throw new Error('The record could not be loaded.')
      const inp = { detail, accountName: s.account.name, accountEmail: s.account.email }
      if (kind === 'statement') printSealedStatement(inp)
      else {
        await exportSealedWorkbook(inp)
        s.flash(`${attestationNumber(a.seq)} exported`)
      }
    } catch (e) {
      s.flash(e instanceof Error ? e.message : 'Could not load the record')
    } finally {
      setDocBusy(null)
    }
  }

  const renewalSoon = st.renewalInDays != null && st.renewalInDays <= 45
  const underinsured = st.gap != null && st.gap > 0

  return (
    <div style={overlay}>
      <div style={panel}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={kicker}>WineSnob insurance{hasSupabase ? '' : ' · demo data'}</div>
            <h1 style={h1}>Insurance</h1>
          </div>
          <button className="ws-modal__close" aria-label="Close" onClick={close}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </header>

        {entitled === false && (
          <div style={card}>
            <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 18, color: 'var(--ws-ink)', marginBottom: 6 }}>By invitation</div>
            <div style={{ fontSize: 13.5, color: 'var(--ws-muted)', lineHeight: 1.6 }}>
              The insurance suite is not enabled for this account. Your administrator can switch it on.
            </div>
          </div>
        )}

        {entitled !== false && (
          <>
            {/* cover status */}
            <div style={{ ...card, borderLeft: underinsured ? '2px solid var(--ws-bordeaux)' : card.borderLeft }}>
              <div style={{ display: 'flex', gap: 'var(--ws-space-5)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={microLabel}>Cellar today</div>
                  <div style={{ ...figure, fontSize: 30 }}>{eur(st.current)}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ws-muted)', marginTop: 4 }}>
                    {st.pricedPositions} of {st.totalPositions} positions market-priced
                    {st.latestValuation ? `, latest ${day(st.latestValuation)}` : ''}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={microLabel}>Declared with insurer</div>
                  <div style={{ ...figure, fontSize: 30, color: st.declared == null ? 'var(--ws-muted)' : 'var(--ws-ink)' }}>
                    {st.declared != null ? eur(st.declared) : '·'}
                  </div>
                  {st.gap != null && (
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: underinsured ? 'var(--ws-bordeaux)' : 'var(--ws-green)' }}>
                      {underinsured ? `Underinsured by ${eur(st.gap)}` : `${eur(Math.abs(st.gap))} headroom`}
                    </div>
                  )}
                </div>
              </div>
              {st.declared == null && (
                <div style={{ fontSize: 13, color: 'var(--ws-muted)', marginTop: 10, lineHeight: 1.55 }}>
                  Enter your policy below and this card starts watching your cover against the living value of the cellar.
                </div>
              )}
              {renewalSoon && st.renewalInDays != null && (
                <div style={{ fontSize: 13, color: 'var(--ws-bordeaux)', marginTop: 8 }}>
                  {st.renewalInDays >= 0
                    ? `The policy renews in ${st.renewalInDays} ${st.renewalInDays === 1 ? 'day' : 'days'} (${policy?.renewal}). Send your insurer a fresh schedule.`
                    : `The policy renewal date (${policy?.renewal}) has passed. Update it below.`}
                </div>
              )}
            </div>

            {/* the checks */}
            <div style={card}>
              <div style={sectionTitle}>What your insurer will ask</div>
              <CheckLine
                ok={!st.overLimit.length}
                text={
                  policy?.itemLimit
                    ? st.overLimit.length
                      ? `${st.overLimit.length} ${st.overLimit.length === 1 ? 'item exceeds' : 'items exceed'} the ${eur(policy.itemLimit)} per-item limit and should be scheduled individually`
                      : `No item exceeds the ${eur(policy.itemLimit)} per-item limit`
                    : 'Enter your per-item limit to check which bottles must be scheduled individually'
                }
              />
              {st.overLimit.length > 0 && (
                <div style={{ margin: '2px 0 10px 26px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {st.overLimit.slice(0, 6).map((b) => (
                    <div key={b.id} style={{ fontSize: 12.5, color: 'var(--ws-muted)' }}>
                      {b.name} {String(b.vintage)} · {eur(unitValueNow(b))} per bottle
                    </div>
                  ))}
                  {st.overLimit.length > 6 && (
                    <div style={{ fontSize: 12.5, color: 'var(--ws-muted)' }}>and {st.overLimit.length - 6} more in the schedule</div>
                  )}
                </div>
              )}
              <CheckLine
                ok={!!st.latestValuation}
                text={
                  st.latestValuation
                    ? `Market valuation current as of ${day(st.latestValuation)}; insurers typically accept valuations up to 12 months old`
                    : 'No market valuation yet; run one from Settings so the schedule carries live prices'
                }
              />
              <CheckLine
                ok={st.missingPaid === 0}
                text={st.missingPaid === 0 ? 'Every position carries its acquisition price' : `${st.missingPaid} ${st.missingPaid === 1 ? 'position lacks' : 'positions lack'} an acquisition price`}
              />
              <CheckLine
                ok={st.missingPhoto === 0}
                text={st.missingPhoto === 0 ? 'Every position has a photograph on file' : `${st.missingPhoto} ${st.missingPhoto === 1 ? 'position has' : 'positions have'} no photograph, which weakens a claim`}
              />
            </div>

            {/* policy facts */}
            <div style={card}>
              <div style={sectionTitle}>Your policy</div>
              <div className="ws-form-2col" style={{ marginTop: 4 }}>
                <TextField label="Insurer" placeholder="e.g. Uniqa Art & Passion" value={draft.insurer} onChange={(e) => setDraft({ ...draft, insurer: e.target.value })} />
                <TextField label="Declared sum (€)" placeholder="e.g. 60000" inputMode="numeric" value={draft.declared} onChange={(e) => setDraft({ ...draft, declared: e.target.value })} />
                <TextField label="Per-item limit (€)" placeholder="e.g. 10000" inputMode="numeric" value={draft.itemLimit} onChange={(e) => setDraft({ ...draft, itemLimit: e.target.value })} />
                <TextField label="Renewal date" type="date" value={draft.renewal} onChange={(e) => setDraft({ ...draft, renewal: e.target.value })} />
              </div>
              <div className="ws-modal-actions" style={{ marginTop: 10 }}>
                <div className="ws-modal-actions__spacer" />
                <Button variant="secondary" onClick={savePolicy}>
                  Save policy details
                </Button>
              </div>
            </div>

            {/* sealed records */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <div style={sectionTitle}>Sealed records</div>
                <div style={{ flex: 1 }} />
                <Button variant="primary" size="sm" onClick={() => setSealConfirm(true)} disabled={sealBusy || s.bottles.length === 0}>
                  Seal inventory now
                </Button>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ws-muted)', lineHeight: 1.6, margin: '6px 0 10px' }}>
                A sealed record freezes every position with its value and basis into a permanent entry the database
                lets no one alter or delete, fingerprinted with SHA-256. After a loss, it is your proof of what the
                cellar held.
              </div>

              {sealConfirm && (
                <div style={confirmCard}>
                  <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 16.5, color: 'var(--ws-ink)' }}>Seal the inventory as it stands?</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ws-ink)' }}>
                    {st.totalPositions} positions at {eur(st.current)} will be recorded. The record is permanent; it can
                    be superseded by a newer seal but never edited or removed.
                  </div>
                  <TextField label="Note (optional)" placeholder="e.g. Annual renewal record" value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="ws-modal-actions">
                    <div className="ws-modal-actions__spacer" />
                    <Button variant="secondary" onClick={() => setSealConfirm(false)} disabled={sealBusy}>
                      Not now
                    </Button>
                    <Button variant="primary" onClick={() => void seal()} disabled={sealBusy}>
                      {sealBusy ? 'Sealing…' : 'Seal the record'}
                    </Button>
                  </div>
                </div>
              )}
              {err && <div style={errText}>{err}</div>}

              {atts.length === 0 && !sealConfirm && (
                <div style={{ fontSize: 13, color: 'var(--ws-muted)' }}>No sealed records yet.</div>
              )}
              {atts.map((a) => (
                <div key={a.id} style={attRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--ws-font-display)', fontSize: 15.5, color: 'var(--ws-ink)' }}>{attestationNumber(a.seq)}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--ws-muted)' }}>{day(a.createdAt)}</span>
                      {a.note && <Tag tone="neutral">{a.note}</Tag>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ws-muted)', marginTop: 2 }}>
                      {a.positions} positions · {a.bottles} bottles · {eur(a.totalValue)}
                    </div>
                    <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, color: 'var(--ws-muted)', marginTop: 3, overflowWrap: 'anywhere' }}>
                      sha256 {a.sha256}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--ws-space-4)', marginTop: 5 }}>
                      <button
                        className="ws-linkish ws-linkish--accent"
                        style={{ ...attLink, color: 'var(--ws-bordeaux)' }}
                        onClick={() => void sealedDoc(a, 'statement')}
                        disabled={docBusy != null}
                      >
                        {docBusy === a.id + 'statement' ? 'Preparing…' : 'Statement'}
                      </button>
                      <button
                        className="ws-linkish"
                        style={attLink}
                        onClick={() => void sealedDoc(a, 'excel')}
                        disabled={docBusy != null}
                      >
                        {docBusy === a.id + 'excel' ? 'Preparing…' : 'Excel'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* documents */}
            <div style={card}>
              <div style={sectionTitle}>Documents for your broker</div>
              <div style={docRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={docName}>Insurance schedule · Excel</div>
                  <div style={docDesc}>Statement cover, the full schedule, and the high-value items, ready for the broker's systems</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void downloadWorkbook()} disabled={exporting}>
                  {exporting ? 'Preparing…' : 'Download'}
                </Button>
              </div>
              <div style={{ ...docRow, borderBottom: 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={docName}>Statement of insurable inventory · PDF</div>
                  <div style={docDesc}>A typeset statement with photographs of the high-value items; opens the print dialog, save as PDF</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => printInsuranceStatement(exportInput())}>
                  Open
                </Button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ws-muted)', lineHeight: 1.55, marginTop: 8 }}>
                Both documents state their basis honestly: market prices with source and date where available, recorded
                values otherwise. They are inventory and market-value statements, not certified appraisals.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CheckLine({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '5px 0' }}>
      <span
        aria-hidden
        style={{
          width: 16,
          height: 16,
          flex: 'none',
          marginTop: 2,
          borderRadius: 999,
          border: `1px solid ${ok ? 'var(--ws-green)' : 'var(--ws-bordeaux)'}`,
          color: ok ? 'var(--ws-green)' : 'var(--ws-bordeaux)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          lineHeight: 1,
        }}
      >
        {ok ? '✓' : '!'}
      </span>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ws-ink)' }}>{text}</span>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  background: 'var(--ws-bg)',
  overflowY: 'auto',
  // A flick past the edge must not chain to the page behind: on iOS that
  // rubber-band can wedge the installed app mid-bounce.
  overscrollBehavior: 'contain',
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
  borderLeft: '0.5px solid var(--ws-border)',
  borderRadius: 'var(--ws-radius-lg)',
  boxShadow: 'var(--ws-shadow-sm)',
  padding: 'var(--ws-space-4) var(--ws-space-5)',
}
const microLabel: React.CSSProperties = { fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 5 }
const figure: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontSize: 24, lineHeight: 1.05, color: 'var(--ws-ink)' }
const sectionTitle: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)', marginBottom: 6 }
const errText: React.CSSProperties = { fontSize: 13, color: 'var(--ws-bordeaux)', lineHeight: 1.45, margin: '6px 0' }
const confirmCard: React.CSSProperties = {
  margin: '4px 0 12px',
  padding: 'var(--ws-space-4) var(--ws-space-5)',
  background: 'var(--ws-cream)',
  border: '0.5px solid var(--ws-border)',
  borderLeft: '2px solid var(--ws-bordeaux)',
  borderRadius: 'var(--ws-radius-md)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}
const attLink: React.CSSProperties = { background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13, padding: '2px 0' }
const attRow: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  padding: '10px 0',
  borderTop: '0.5px solid var(--ws-border)',
}
const docRow: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '0.5px solid var(--ws-border)',
}
const docName: React.CSSProperties = { fontSize: 14.5, fontWeight: 500, color: 'var(--ws-ink)' }
const docDesc: React.CSSProperties = { fontSize: 12.5, color: 'var(--ws-muted)', lineHeight: 1.5, marginTop: 2 }
