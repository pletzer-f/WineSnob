import { useRef } from 'react'
import {
  CaptureBar,
  ProcessingState,
  Uploader,
  ImportCard,
  NumberStepper,
  TextField,
  Select,
  Button,
} from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { hasSupabase } from '@/lib/supabase'
import { readLabels, parseImport } from '@/data/ai'
import type { CaptureMode } from '@/store/store'

const COLOUR_OPTIONS = [
  { label: 'Red', value: 'red' },
  { label: 'White', value: 'white' },
  { label: 'Rosé', value: 'rose' },
  { label: 'Sparkling', value: 'sparkling' },
  { label: 'Fortified', value: 'fortified' },
]

export function AddBottle() {
  const s = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const runCapture = async (files: File[]) => {
    useStore.setState({ addStep: 'processing', processCurrent: 0, captured: [], aiError: null })
    try {
      const reads = await readLabels(files, s.addMode)
      s.ingestReads(reads, 420)
    } catch (e) {
      s.setAiError(e instanceof Error ? e.message : 'Could not read that photo.')
      s.flash('Could not read that photo. Try again.')
      s.backToCapture()
    }
  }

  const onCapture = () => {
    if (hasSupabase) fileRef.current?.click()
    else runCapture([]) // demo: one-tap simulated read
  }

  const runImport = async (files: File[]) => {
    useStore.setState({ addStep: 'processing', processCurrent: 0, captured: [], aiError: null })
    try {
      const reads = await parseImport(files[0])
      s.ingestReads(reads, 320)
    } catch (e) {
      s.setAiError(e instanceof Error ? e.message : 'Could not read that file.')
      s.flash('Could not read that file.')
      useStore.setState({ addStep: 'import' })
    }
  }

  const onImportClick = () => {
    if (hasSupabase) importRef.current?.click()
    else runImport([])
  }

  return (
    <div className="ws-mobile-pad" style={page}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={s.addMode === 'case'}
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : []
          if (files.length) runCapture(files)
          e.target.value = ''
        }}
      />
      <input
        ref={importRef}
        type="file"
        accept=".csv,.xlsx,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : []
          if (files.length) runImport(files)
          e.target.value = ''
        }}
      />

      {s.addStep === 'capture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-6)', width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...kicker, marginBottom: 8 }}>Add to cellar</div>
            <h1 style={{ ...h1, fontSize: 34, marginBottom: 10 }}>Add a bottle</h1>
            <p style={{ margin: '0 auto', maxWidth: 520, fontSize: 15, lineHeight: 1.55, color: 'var(--ws-muted)' }}>
              Point at a label and WineSnob reads the vintage, producer and region for you — or photograph a whole case to add a rack at once.
            </p>
          </div>

          <div className="ws-add-cols">
            <div className="ws-cap-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}>
              <CaptureBar mode={s.addMode} onModeChange={(m) => s.setMode(m as CaptureMode)} onCapture={onCapture} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--ws-space-3)' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 2 }}>Or add another way</div>
              <button className="ws-hairline-btn" onClick={s.openManual} style={altBtn}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 19, color: 'var(--ws-ink)', marginBottom: 5 }}>Enter by hand</div>
                  <div style={{ fontSize: 13.5, color: 'var(--ws-muted)', lineHeight: 1.5 }}>Type the wine in yourself — every field, full control.</div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--ws-muted)', flexShrink: 0 }}>→</span>
              </button>
              <button className="ws-hairline-btn" onClick={s.goImport} style={altBtn}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 19, color: 'var(--ws-ink)', marginBottom: 5 }}>Import a list</div>
                  <div style={{ fontSize: 13.5, color: 'var(--ws-muted)', lineHeight: 1.5 }}>Bring in a spreadsheet or a merchant order in one go.</div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--ws-muted)', flexShrink: 0 }}>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {s.addStep === 'import' && (
        <>
          <button className="ws-linkish" onClick={s.backToCapture} style={backBtn}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>←</span> Capture instead
          </button>
          <div>
            <h1 style={{ ...h1, fontSize: 28, marginBottom: 6 }}>Import a list</h1>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--ws-muted)' }}>
              Bring an existing cellar in from a spreadsheet or a merchant order. We’ll match each line, then you confirm.
            </p>
          </div>
          <Uploader title="Drop a file to import" hint="CSV, Excel, or a CellarTracker export, up to 5,000 rows" accept=".csv,.xlsx,.pdf" onFiles={(f) => runImport(Array.from(f))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ws-space-3)' }}>
            <ImportCard title="From a spreadsheet" hint="CSV, Excel, or a CellarTracker export" badge="CSV" onClick={onImportClick} />
            <ImportCard title="From a merchant list" hint="A PDF order or invoice from your wine merchant" badge="PDF" onClick={onImportClick} />
          </div>
        </>
      )}

      {s.addStep === 'processing' && (
        <div style={{ marginTop: 'var(--ws-space-6)', background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', overflow: 'hidden' }}>
          <ProcessingState current={s.processCurrent} total={Math.max(1, s.captured.length || s.processCurrent)} message={s.addMode === 'case' ? 'Reading your bottles…' : 'Reading the label…'} />
        </div>
      )}

      {s.addStep === 'review' && <ReviewStep />}
    </div>
  )
}

function ReviewStep() {
  const s = useStore()
  const rows = s.captured
  const flagged = rows.filter((r) => r.confidence !== 'high').length
  const dupCount = rows.filter((r) => r.dupId).length
  const totalBottles = rows.reduce((a, r) => a + Math.max(1, r.quantity || 1), 0)
  const needsAttention = flagged > 0 || dupCount > 0
  const attnParts: string[] = []
  if (flagged) attnParts.push(`${flagged} read${flagged === 1 ? '' : 's'} need${flagged === 1 ? 's' : ''} a quick check`)
  if (dupCount) attnParts.push(`${dupCount} already in your cellar`)
  const attention = `${attnParts.join(' · ')}. Expand a row to fix details, set quantity, location or value.`

  const segStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--ws-bordeaux)' : 'transparent',
    color: active ? '#fff' : 'var(--ws-ink)',
    border: 0,
    padding: '7px 13px',
    font: 'inherit',
    fontSize: 12.5,
    cursor: 'pointer',
  })

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--ws-space-3)', flexWrap: 'wrap' }}>
        <div>
          <div style={kicker}>Review reads</div>
          <h1 style={{ ...h1, fontSize: 28 }}>{`${rows.length} ${rows.length === 1 ? 'wine read' : 'wines read'}`}</h1>
        </div>
        <div style={{ fontSize: 14, color: 'var(--ws-muted)', textAlign: 'right' }}>
          {`${totalBottles} ${totalBottles === 1 ? 'bottle' : 'bottles'} · ${needsAttention ? 'review below' : 'all confident'}`}
        </div>
      </div>

      {needsAttention && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--ws-cream)', border: '0.5px solid var(--ws-border)', borderLeft: '3px solid var(--ws-bordeaux)', borderRadius: 'var(--ws-radius-md)', padding: '12px 16px' }}>
          <span style={{ fontSize: 13, color: 'var(--ws-ink)', lineHeight: 1.45 }}>{attention}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
        {rows.map((r, i) => {
          const isMerge = r.dupMode === 'merge'
          const meta = [r.producer, r.vintage === '' || r.vintage == null ? null : r.vintage, r.region].filter(Boolean).join(' · ')
          const dotColor = r.confidence === 'high' ? 'var(--ws-green)' : r.confidence === 'medium' ? '#c08a2d' : 'var(--ws-bordeaux)'
          const expanded = !!s.reviewExpanded[i]
          const dupMessage = r.dupId
            ? isMerge
              ? `Already in your cellar — adding to ${r.dupName} (now ${r.dupQty}, becomes ${r.dupQty + (r.quantity || 1)}).`
              : `Already in your cellar — ${r.dupName} (${r.dupQty} on hand). Keeping this as a separate line.`
            : ''
          return (
            <div key={i} style={{ background: 'var(--ws-surface)', border: `0.5px solid ${r.confidence === 'low' ? 'var(--ws-bordeaux)' : 'var(--ws-border)'}`, borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: 999, background: dotColor }} />
                <button onClick={() => s.toggleReviewRow(i)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 0, cursor: 'pointer', font: 'inherit', padding: 0 }}>
                  <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name || 'Unread label'}</div>
                  <div style={{ fontSize: 13, color: 'var(--ws-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta || 'Tap to add the details'}</div>
                </button>
                <div style={{ flexShrink: 0 }}>
                  <NumberStepper value={r.quantity} min={1} max={999} onChange={(v) => s.setCapturedQty(i, v)} label="Bottles" />
                </div>
                <button onClick={() => s.toggleReviewRow(i)} aria-label="Toggle details" style={{ flexShrink: 0, width: 30, height: 30, display: 'grid', placeItems: 'center', background: 'none', border: 0, cursor: 'pointer', color: 'var(--ws-muted)', fontSize: 12, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }}>
                  ▾
                </button>
              </div>

              {r.dupId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '11px 16px', background: 'var(--ws-cream)', borderTop: '0.5px solid var(--ws-border)' }}>
                  <span style={{ flex: 1, minWidth: 160, fontSize: 13, color: 'var(--ws-ink)', lineHeight: 1.4 }}>{dupMessage}</span>
                  <div style={{ display: 'inline-flex', border: '0.5px solid var(--ws-border-strong)', borderRadius: 999, overflow: 'hidden', flexShrink: 0 }}>
                    <button onClick={() => s.setDupMode(i, 'merge')} style={segStyle(isMerge)}>Add to it</button>
                    <button onClick={() => s.setDupMode(i, 'new')} style={segStyle(!isMerge)}>Keep separate</button>
                  </div>
                </div>
              )}

              {expanded && (
                <div style={{ padding: 16, borderTop: '0.5px solid var(--ws-border)', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                  <TextField label="Wine name" value={r.name} onChange={(e) => s.updateCaptured(i, { name: e.target.value })} />
                  <TextField label="Producer" value={r.producer} onChange={(e) => s.updateCaptured(i, { producer: e.target.value })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ws-space-4)' }}>
                    <Select label="Colour" options={COLOUR_OPTIONS} value={r.colour} onChange={(e) => s.updateCaptured(i, { colour: e.target.value as typeof r.colour })} />
                    <TextField label="Vintage" placeholder="2015" value={String(r.vintage ?? '')} onChange={(e) => s.updateCaptured(i, { vintage: e.target.value })} />
                  </div>
                  <TextField label="Region" value={r.region} onChange={(e) => s.updateCaptured(i, { region: e.target.value })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ws-space-4)' }}>
                    <TextField label="Cellar location" placeholder="Rack 4 · Bin 12" value={r.location} onChange={(e) => s.updateCaptured(i, { location: e.target.value })} />
                    <TextField label="Value per bottle (€)" placeholder="120" value={String(r.unit ?? '')} onChange={(e) => s.updateCaptured(i, { unit: e.target.value })} />
                  </div>
                  <button className="ws-linkish ws-linkish--accent" onClick={() => s.discardCaptured(i)} style={{ alignSelf: 'flex-start', background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13, padding: '4px 0' }}>
                    Discard this read
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 'var(--ws-space-3)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={s.backToCapture}>
          Capture more
        </Button>
        <Button variant="primary" onClick={s.confirmBatch}>
          {`Add ${totalBottles} to cellar`}
        </Button>
      </div>
    </>
  )
}

const page: React.CSSProperties = {
  width: '100%',
  maxWidth: 880,
  margin: '0 auto',
  padding: 'var(--ws-space-6)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--ws-space-5)',
}
const kicker: React.CSSProperties = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 7 }
const h1: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 34, lineHeight: 1.05, margin: 0, color: 'var(--ws-ink)' }
const backBtn: React.CSSProperties = { alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 14, padding: '4px 0' }
const altBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--ws-space-4)',
  textAlign: 'left',
  background: 'var(--ws-surface)',
  border: '0.5px solid var(--ws-border)',
  borderRadius: 'var(--ws-radius-lg)',
  boxShadow: 'var(--ws-shadow-sm)',
  padding: 'var(--ws-space-5)',
  cursor: 'pointer',
  font: 'inherit',
  width: '100%',
}
