import { FormSection, TextField, Select, NumberStepper, TextArea, Button } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { FORMAT_DEFS, fmtDef, fmtLitres } from '@/domain/formats'

const COLOUR_OPTIONS = [
  { label: 'Red', value: 'red' },
  { label: 'White', value: 'white' },
  { label: 'Rosé', value: 'rose' },
  { label: 'Sparkling', value: 'sparkling' },
  { label: 'Fortified', value: 'fortified' },
]
const REGION_OPTIONS = [
  { label: 'Bordeaux', value: 'Bordeaux' },
  { label: 'Burgundy', value: 'Burgundy' },
  { label: 'Champagne', value: 'Champagne' },
  { label: 'Northern Rhône', value: 'Northern Rhône' },
  { label: 'Southern Rhône', value: 'Southern Rhône' },
  { label: 'Loire', value: 'Loire' },
  { label: 'Alsace', value: 'Alsace' },
  { label: 'Piedmont', value: 'Piedmont' },
  { label: 'Tuscany', value: 'Tuscany' },
  { label: 'Douro', value: 'Douro' },
  { label: 'Other', value: 'Other' },
]
const STATUS_OPTIONS = [
  { label: 'Ready to drink', value: 'ready' },
  { label: 'Cellaring', value: 'cellaring' },
  { label: 'Past peak', value: 'past' },
]

export function EditBottle() {
  const s = useStore()
  const form = s.form
  const editIsExisting = !!s.editId
  const fFmt = fmtDef(form.format)
  const formatOptions = FORMAT_DEFS.map((d) => ({ label: `${d.label} · ${fmtLitres(d.litres)}`, value: d.key }))
  const formatHint =
    fFmt.equiv === 1
      ? 'The 750 ml bottle — the standard.'
      : `${fmtLitres(fFmt.litres)} · counts as ${fFmt.equiv} standard bottle${fFmt.equiv === 1 ? '' : 's'}` +
        (fFmt.age > 1 ? ' · ages more slowly' : fFmt.age < 1 ? ' · ages faster' : '')
  const valueHint = s.settings.autoValue ? `Auto-updated ${s.settings.priceCadence === 'monthly' ? 'monthly' : 'quarterly'}` : 'Set manually'
  const editBackLabel = s.editFrom === 'detail' ? 'Back to bottle' : s.editFrom === 'add' ? 'Back to add' : 'Back to cellar'

  return (
    <div className="ws-mobile-pad" style={page}>
      <button className="ws-linkish" onClick={s.editCancel} style={backBtn}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>←</span> {editBackLabel}
      </button>

      <div>
        <div style={kicker}>{editIsExisting ? 'Edit bottle' : 'New bottle'}</div>
        <h1 style={h1}>{editIsExisting ? form.name || 'Edit bottle' : 'Enter by hand'}</h1>
      </div>

      <FormSection title="Identity">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
          <TextField label="Wine name" placeholder="e.g. Château Margaux" value={form.name} onChange={(e) => s.setField('name', e.target.value)} error={s.errors.name} />
          <TextField label="Producer" placeholder="e.g. Premier Grand Cru Classé" value={form.producer} onChange={(e) => s.setField('producer', e.target.value)} />
        </div>
      </FormSection>

      <FormSection title="Classification">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ws-space-4)' }}>
            <Select label="Colour" options={COLOUR_OPTIONS} value={form.colour} onChange={(e) => s.setField('colour', e.target.value as typeof form.colour)} />
            <TextField label="Vintage" placeholder="2015" value={form.vintage} onChange={(e) => s.setField('vintage', e.target.value)} hint="NV for non-vintage" error={s.errors.vintage} />
          </div>
          <Select label="Region" options={REGION_OPTIONS} placeholder="Choose a region" value={form.region} onChange={(e) => s.setField('region', e.target.value)} />
        </div>
      </FormSection>

      <FormSection title="In the cellar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
          <div>
            <div style={miniLabel}>Bottles held</div>
            <NumberStepper value={form.quantity} min={0} max={999} onChange={(v) => s.setField('quantity', v)} label="Bottles held" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ws-space-4)' }}>
            <TextField label="Price paid / bottle (€)" placeholder="90" value={form.paid} onChange={(e) => s.setField('paid', e.target.value)} hint="What you actually paid" />
            <TextField label="Current value / bottle (€)" placeholder="120" value={form.unit} onChange={(e) => s.setField('unit', e.target.value)} hint={valueHint} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ws-space-4)' }}>
            <Select label="Bottle size" options={formatOptions} value={form.format} onChange={(e) => s.setField('format', e.target.value as typeof form.format)} hint={formatHint} />
            <Select label="Drink window" options={STATUS_OPTIONS} value={form.status} onChange={(e) => s.setField('status', e.target.value as typeof form.status)} hint="When the bottle is at its best." />
          </div>
        </div>
      </FormSection>

      <FormSection title="Tasting">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
          <div>
            <div style={miniLabel}>Your rating</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => s.setField('rating', n === form.rating ? n - 1 : n)}
                    aria-label={`Rate ${n}`}
                    style={{ width: 26, height: 26, padding: 0, border: 0, background: 'none', cursor: 'pointer', color: n <= form.rating ? 'var(--ws-bordeaux)' : 'var(--ws-border-strong)', fontSize: 22, lineHeight: 1 }}
                  >
                    {n <= form.rating ? '●' : '○'}
                  </button>
                ))}
              </div>
              <button className="ws-linkish" onClick={() => s.setField('rating', 0)} style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 12, padding: 4 }}>
                {form.rating ? 'Clear' : 'Not rated'}
              </button>
            </div>
          </div>
          <TextArea label="Tasting notes" placeholder="Cassis, violet, graphite…" rows={4} value={form.note} onChange={(e) => s.setField('note', e.target.value)} />
        </div>
      </FormSection>

      <div style={{ display: 'flex', gap: 'var(--ws-space-3)', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-5)' }}>
        {editIsExisting && (
          <Button variant="ghost" onClick={s.deleteBottle}>
            Remove from cellar
          </Button>
        )}
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={s.editCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={s.saveBottle}>
          {editIsExisting ? 'Save changes' : 'Add to cellar'}
        </Button>
      </div>
    </div>
  )
}

const page: React.CSSProperties = {
  width: '100%',
  maxWidth: 620,
  margin: '0 auto',
  padding: 'var(--ws-space-6)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--ws-space-5)',
}
const backBtn: React.CSSProperties = { alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 14, padding: '4px 0' }
const kicker: React.CSSProperties = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 7 }
const h1: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 30, lineHeight: 1.04, margin: 0, color: 'var(--ws-ink)' }
const miniLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 8 }
