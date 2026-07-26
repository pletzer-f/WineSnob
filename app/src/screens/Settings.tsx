import { useEffect, useState } from 'react'
import { Avatar, Button, SectionHeader, SettingsRow, Switch, Select } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { exportCellarCSV, exportWorkbook, type ExportInput } from '@/data/exporter'
import { CREDIT_FLOOR_USD, SOMMELIER_COST_USD, VALUATION_COST_USD } from '@/data/credits'
import { fetchInsuranceEntitled } from '@/data/insurance'
import type { Currency, PriceCadence, ViewMode } from '@/domain/types'

// Euro only for now: values do not convert between currencies yet, so the
// selector is locked until live FX rates are wired in.
const CURRENCY_OPTIONS = [{ label: 'Euro (€)', value: 'EUR' }]
const CADENCE_OPTIONS = [
  { label: 'Every month', value: 'monthly' },
  { label: 'Every 3 months', value: 'quarterly' },
  { label: 'Every 6 months', value: 'semiannual' },
]
const VIEW_OPTIONS = [
  { label: 'Grid', value: 'grid' },
  { label: 'List', value: 'list' },
]

export function Settings() {
  const s = useStore()
  const S = s.settings
  const A = s.account
  const [exporting, setExporting] = useState(false)

  const exportInput = (): ExportInput => ({
    cellars: s.cellars,
    bottles: s.bottles,
    drinks: s.drinks,
    wishlist: s.wishlist,
    accountName: A.name,
    accountEmail: A.email,
  })
  const downloadCSV = () => {
    exportCellarCSV(exportInput())
    s.flash('Cellar exported as CSV')
  }
  const downloadWorkbook = async () => {
    setExporting(true)
    try {
      await exportWorkbook(exportInput())
      s.flash('Workbook exported')
    } catch {
      s.flash('Export failed, please try again')
    } finally {
      setExporting(false)
    }
  }

  const valued = s.bottles.filter((b) => b.marketSource)
  const connected = s.valuationConfigured === true || valued.length > 0
  const notConnected = s.valuationConfigured === false && valued.length === 0
  const valSource = s.valuationInfo?.source || valued[0]?.marketSource || 'Wine-Searcher'
  const valAsOf = s.valuationInfo?.asOf || valued.map((b) => b.marketAsOf).filter(Boolean).sort().pop()

  // The manual run is capped at once a month, and it costs real money:
  // an explicit confirmation with an estimate stands before it.
  const [valConfirm, setValConfirm] = useState(false)
  const nextManual = s.manualValuedAt ? new Date(new Date(s.manualValuedAt).getTime() + 30 * 86400000) : null
  const manualLocked = !!nextManual && nextManual.getTime() > Date.now()
  const nextManualDay = nextManual ? nextManual.toISOString().slice(0, 10) : ''
  const wineCount = s.bottles.length
  const estUsd = Math.max(1, Math.round(wineCount * 0.28))
  const valuationDesc = connected
    ? `Priced by ${valSource}${valAsOf ? `, as of ${valAsOf}` : ''}.${manualLocked ? ` Manual pricing again from ${nextManualDay}.` : ' One manual run a month.'}`
    : notConnected
      ? 'Not connected. A price source key is needed to value at live market prices.'
      : `AI prices each wine from live merchant and auction listings.${manualLocked ? ` Available again ${nextManualDay}.` : ' One manual run a month.'}`

  const confirmValuation = () => {
    setValConfirm(false)
    void s.refreshValuations(true)
  }

  // Usage credits: the balance, and what it buys in plain terms.
  useEffect(() => {
    void s.refreshCredits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The insurance suite shows only for accounts holding the tier.
  const [insEntitled, setInsEntitled] = useState(false)
  useEffect(() => {
    void fetchInsuranceEntitled().then(setInsEntitled)
  }, [])
  const bal = s.creditBalance
  const balKnown = bal != null
  const negative = balKnown && bal < 0
  const floored = balKnown && bal < CREDIT_FLOOR_USD
  const valuationsLeft = balKnown ? Math.max(0, Math.floor(bal / VALUATION_COST_USD)) : 0
  const questionsLeft = balKnown ? Math.max(0, Math.floor(bal / SOMMELIER_COST_USD)) : 0
  const creditDesc = !balKnown
    ? 'Your balance loads with the live backend.'
    : floored
      ? 'Your credit is used up and AI features are paused. Ask your administrator to top up.'
      : negative
        ? 'You are drawing on courtesy credit. Please ask your administrator to top up.'
        : bal === 0
          ? 'No credit yet. Your administrator can grant a starting balance.'
          : `Roughly ${valuationsLeft} bottle ${valuationsLeft === 1 ? 'valuation' : 'valuations'} or ${questionsLeft} sommelier questions.`
  const runCost = Math.max(1, Math.round(wineCount * VALUATION_COST_USD))
  const afterRun = balKnown ? bal - runCost : null

  return (
    <div className="ws-mobile-pad" style={page}>
      <div>
        <div style={kicker}>Your account &amp; preferences</div>
        <h1 style={h1}>Settings</h1>
      </div>

      {/* account */}
      <div style={{ background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', padding: 'var(--ws-space-5)', display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)' }}>
        <Avatar name={A.name} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 20, color: 'var(--ws-ink)' }}>{A.name}</div>
          <div style={{ fontSize: 13, color: 'var(--ws-muted)', marginTop: 2 }}>{`${A.email} · ${A.plan} plan`}</div>
        </div>
        <Button variant="secondary" onClick={s.openAccount}>
          Manage
        </Button>
      </div>

      {/* notifications */}
      <Group title="Notifications">
        <SettingsRow label="Drink-window reminders" description="Tell me when a wine enters its window" control={<Switch checked={S.reminders} onChange={(c) => s.toggleSetting('reminders', c)} label="Drink-window reminders" />} />
        <SettingsRow label="Weekly cellar digest" description="A Sunday summary of value and what’s ready" control={<Switch checked={S.weekly} onChange={(c) => s.toggleSetting('weekly', c)} label="Weekly cellar digest" />} />
      </Group>

      {/* usage credits */}
      <Group title="Usage credits">
        <SettingsRow
          label="Balance"
          description={creditDesc}
          control={
            <span style={{ fontFamily: 'var(--ws-font-display)', fontSize: 22, color: floored || negative ? 'var(--ws-bordeaux)' : 'var(--ws-ink)' }}>
              {balKnown ? `$${bal.toFixed(2)}` : '·'}
            </span>
          }
        />
      </Group>

      {/* insurance (admin-granted tier) */}
      {insEntitled && (
        <Group title="Insurance">
          <SettingsRow
            label="Insurance suite"
            description="Declared cover against live value, sealed inventory records, and the documents your broker asks for"
            control={<Button variant="secondary" onClick={s.openInsurance}>Open</Button>}
          />
        </Group>
      )}

      {/* valuation */}
      <Group title="Valuation">
        <SettingsRow
          label="Market pricing"
          description={valuationDesc}
          control={
            <Button
              variant={connected ? 'secondary' : 'primary'}
              onClick={() => setValConfirm(true)}
              disabled={s.valuationBusy || manualLocked || wineCount === 0}
            >
              {s.valuationBusy ? 'Valuing…' : manualLocked ? `From ${nextManualDay}` : connected ? 'Refresh now' : 'Value my cellar'}
            </Button>
          }
        />
        {valConfirm && !manualLocked && (
          <div style={{ margin: '10px 0 14px', padding: 'var(--ws-space-4) var(--ws-space-5)', background: 'var(--ws-cream)', border: '0.5px solid var(--ws-border)', borderLeft: '2px solid var(--ws-bordeaux)', borderRadius: 'var(--ws-radius-md)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 16.5, color: 'var(--ws-ink)' }}>
              Price {wineCount} {wineCount === 1 ? 'wine' : 'wines'} at live market?
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ws-ink)' }}>
              Claude reads current merchant and auction listings for every wine in your cellar. This run costs roughly{' '}
              <strong>${estUsd}</strong> in AI usage, and manual pricing is available once a month. Your automatic
              schedule keeps running either way.
            </div>
            {balKnown && (
              <div style={{ fontSize: 13, lineHeight: 1.5, color: afterRun != null && afterRun < 0 ? 'var(--ws-bordeaux)' : 'var(--ws-muted)' }}>
                You hold <strong>${bal.toFixed(2)}</strong> in credit.
                {afterRun != null && afterRun < 0
                  ? ` This run would overdraw your balance by about $${Math.abs(afterRun).toFixed(2)}.`
                  : ` About $${afterRun?.toFixed(2)} would remain.`}
              </div>
            )}
            <div className="ws-modal-actions">
              <div className="ws-modal-actions__spacer" />
              <Button variant="secondary" onClick={() => setValConfirm(false)}>
                Not now
              </Button>
              <Button variant="primary" onClick={confirmValuation}>
                Price my cellar
              </Button>
            </div>
          </div>
        )}
        <SettingsRow label="Auto-update valuations" description="Quietly revalue stale bottles when you open the app" control={<Switch checked={S.autoValue} onChange={(c) => s.toggleSetting('autoValue', c)} label="Auto-update valuations" />} />
        <SettingsRow label="Update frequency" description="How often valuations refresh when auto-update is on" control={<div style={{ minWidth: 150 }}><Select options={CADENCE_OPTIONS} value={S.priceCadence} onChange={(e) => s.setCadence(e.target.value as PriceCadence)} /></div>} />
      </Group>

      {/* cellar */}
      <Group title="Cellar">
        <SettingsRow label="Currency" description="Euro only for now; more currencies arrive with live exchange rates" control={<div style={{ minWidth: 150 }}><Select options={CURRENCY_OPTIONS} value="EUR" disabled onChange={(e) => s.setCurrency(e.target.value as Currency)} /></div>} />
        <SettingsRow label="Default view" description="How the cellar opens" control={<div style={{ minWidth: 150 }}><Select options={VIEW_OPTIONS} value={S.defaultView} onChange={(e) => s.setDefaultView(e.target.value as ViewMode)} /></div>} />
      </Group>

      {/* export */}
      <Group title="Export">
        <SettingsRow
          label="Excel workbook"
          description="Overview, cellar, drinking history and wishlist in one file, ready for Excel or Numbers"
          control={
            <Button variant="secondary" onClick={downloadWorkbook} disabled={exporting}>
              {exporting ? 'Preparing…' : 'Download'}
            </Button>
          }
        />
        <SettingsRow
          label="CSV file"
          description="The cellar as plain comma-separated text, for any tool"
          control={<Button variant="secondary" onClick={downloadCSV}>Download</Button>}
        />
      </Group>

      {/* sharing */}
      <Group title="Sharing">
        <SettingsRow label="Share my cellar" description="A read-only link for friends" control={<Switch checked={S.share} onChange={(c) => s.toggleSetting('share', c)} label="Share my cellar" />} />
        <SettingsRow label="Household access" description="Let members add and edit bottles" control={<Switch checked={S.household} onChange={(c) => s.toggleSetting('household', c)} label="Household access" />} />
      </Group>

      {/* setup */}
      <Group title="Setup">
        <SettingsRow label="Manage cellars" description="Name, add or remove cellars (up to three)" control={<Button variant="secondary" onClick={s.openCellarManage}>Manage</Button>} />
        <SettingsRow label="Replay onboarding" description="See the welcome and cellar setup flow again" control={<Button variant="secondary" onClick={s.replayOnboarding}>Replay</Button>} />
        <SettingsRow label="Admin console" description="Accounts, usage and cost, for administrators" control={<Button variant="secondary" onClick={s.openAdmin}>Open</Button>} />
      </Group>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--ws-space-3)', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-5)' }}>
        <div style={{ fontSize: 12, color: 'var(--ws-muted)' }}>WineSnob · v0.1.0</div>
        <Button variant="ghost" onClick={s.openSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
      <SectionHeader title={title} />
      <div style={{ background: 'var(--ws-surface)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-lg)', boxShadow: 'var(--ws-shadow-sm)', padding: '2px 18px' }}>
        {children}
      </div>
    </div>
  )
}

const page: React.CSSProperties = { width: '100%', maxWidth: 640, margin: '0 auto', padding: 'var(--ws-space-6)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-5)' }
const kicker: React.CSSProperties = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 7 }
const h1: React.CSSProperties = { fontFamily: 'var(--ws-font-display)', fontWeight: 500, fontSize: 34, lineHeight: 1, margin: 0, color: 'var(--ws-ink)' }
