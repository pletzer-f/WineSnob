// WineSnob — cellar export. The workbook data is built once by pure
// functions, then handed to either the plain CSV writer or SheetJS for a
// real .xlsx. SheetJS is imported lazily so it never weighs down the app
// bundle; it only loads the moment an export is requested.

import type { Bottle, Cellar, Drink, Policy, Wish } from '@/domain/types'
import { bottleValue, hasMarketValue, unitValueNow } from '@/domain/valuation'
import { costBasis, totalReturn } from '@/domain/portfolio'
import { attestationNumber, insuranceStatus, type Attestation, type AttestationDetail } from '@/data/insurance'
import { fnLabel, statementNumber, type BillingStatement } from '@/data/admin'
import { fmtDef } from '@/domain/formats'

export interface ExportInput {
  cellars: Cellar[]
  bottles: Bottle[]
  drinks: Drink[]
  wishlist: Wish[]
  accountName: string
  accountEmail: string
}

type Cell = string | number | null

export interface ExportSheet {
  name: string
  rows: Cell[][]
  /** Column indexes holding euro amounts, formatted as currency in Excel. */
  money: number[]
  /** Column widths in characters. */
  widths: number[]
}

const round2 = (n: number) => Math.round(n * 100) / 100
const eur = (n: number) => `€${Math.round(n).toLocaleString('en-US')}`
const today = () => new Date().toISOString().slice(0, 10)

/** The cellar as a flat stock list, one row per position. */
export function cellarSheet(input: ExportInput): ExportSheet {
  const order = new Map(input.cellars.map((c, i) => [c.id, i]))
  const cellarName = new Map(input.cellars.map((c) => [c.id, c.name]))
  const bottles = input.bottles
    .slice()
    .sort((a, b) => (order.get(a.cellarId) ?? 9) - (order.get(b.cellarId) ?? 9) || a.name.localeCompare(b.name))
  const rows: Cell[][] = [
    [
      'Cellar', 'Wine', 'Producer', 'Vintage', 'Colour', 'Region', 'Country', 'Format', 'Quantity', 'Status',
      'Drink from', 'Drink to', 'Rating (0-5)', 'Score', 'Grapes', 'Location',
      'Paid / bottle', 'Recorded value / bottle', 'Market / bottle', 'Market low', 'Market high',
      'Priced by', 'Priced on', 'Position value', 'Gain vs paid', 'Market read', 'Note',
    ],
  ]
  for (const b of bottles) {
    const market = hasMarketValue(b)
    const value = round2(bottleValue(b))
    rows.push([
      cellarName.get(b.cellarId) ?? b.cellarId, b.name, b.producer, b.vintage, b.colour, b.region, b.country,
      b.format || 'standard', b.quantity, b.status,
      b.drinkFrom ?? null, b.drinkTo ?? null, b.rating || null, b.score || null,
      (b.grapes || []).join('; '), b.location || '',
      b.paid != null && b.paid > 0 ? b.paid : null, b.unit || null, market ? b.marketUnit! : null,
      market ? (b.marketLow ?? null) : null, market ? (b.marketHigh ?? null) : null,
      market ? (b.marketSource ?? '') : '', market ? (b.marketAsOf ?? '') : '',
      value, b.paid != null && b.paid > 0 ? round2(value - b.paid * b.quantity) : null,
      b.marketRead || '', b.note || '',
    ])
  }
  return {
    name: 'Cellar',
    rows,
    money: [16, 17, 18, 19, 20, 23, 24],
    widths: [12, 30, 26, 8, 10, 22, 10, 10, 9, 10, 10, 9, 12, 7, 18, 16, 13, 13, 13, 11, 11, 16, 11, 14, 12, 44, 30],
  }
}

/** Every pour ever logged, newest first. */
export function historySheet(input: ExportInput): ExportSheet {
  const drinks = input.drinks.slice().sort((a, b) => b.date.localeCompare(a.date))
  const rows: Cell[][] = [
    ['Date', 'Wine', 'Producer', 'Vintage', 'Region', 'Colour', 'Format', 'Occasion', 'Companions',
      'Rating (0-5)', 'Value at pour', 'Cost / bottle', 'Buy again', 'Note'],
  ]
  for (const d of drinks) {
    rows.push([
      d.date, d.name, d.producer, d.vintage, d.region, d.colour, d.format || 'standard', d.occasion,
      d.companions || '', d.rating || null, d.valueAtDrink ?? null, d.paidAtDrink ?? null,
      d.buyAgain ? 'yes' : '', d.note || '',
    ])
  }
  return { name: 'Drinking history', rows, money: [10, 11], widths: [11, 30, 26, 8, 22, 10, 10, 12, 18, 12, 13, 13, 10, 40] }
}

/** Wines being hunted. */
export function wishlistSheet(input: ExportInput): ExportSheet {
  const rows: Cell[][] = [['Wine', 'Producer', 'Vintage', 'Region', 'Priority', 'Target price', 'Note']]
  for (const w of input.wishlist) {
    rows.push([w.name, w.producer, w.vintage || '', w.region, w.priority, w.targetPrice ?? null, w.note || ''])
  }
  return { name: 'Wishlist', rows, money: [5], widths: [30, 26, 8, 22, 10, 13, 40] }
}

/** A statement cover: the headline figures behind the sheets. */
export function overviewSheet(input: ExportInput): ExportSheet {
  const cb = costBasis(input.bottles)
  const tr = totalReturn(input.bottles, input.drinks)
  const totalMarket = input.bottles.reduce((sum, b) => sum + bottleValue(b), 0)
  const bottleCount = input.bottles.reduce((sum, b) => sum + b.quantity, 0)
  const priced = input.bottles.filter(hasMarketValue).length
  const rows: Cell[][] = [
    ['WineSnob cellar export', ''],
    ['Exported', today()],
    ['Account', `${input.accountName} (${input.accountEmail})`],
    ['Cellars', input.cellars.map((c) => c.name).join(', ')],
    ['', ''],
    ['Positions', input.bottles.length],
    ['Bottles', bottleCount],
    ['Cellar value', eur(totalMarket)],
    ['Market-priced positions', `${priced} of ${input.bottles.length}`],
    ['', ''],
    ['Invested in current holdings', cb.invested > 0 ? eur(cb.invested) : 'no costs recorded'],
    ['Invested all-time (incl. enjoyed)', tr.investedAll > 0 ? eur(tr.investedAll) : 'no costs recorded'],
    ['Total return (market + enjoyed vs invested)',
      tr.gainPct != null ? `${eur(tr.gain)} (${tr.gain >= 0 ? '+' : ''}${tr.gainPct.toFixed(1)}%)` : 'record costs to see returns'],
    ['Enjoyed all-time', `${input.drinks.length} pours · ${eur(tr.enjoyedAll)}`],
    ['', ''],
    ['Values are live market prices where available, otherwise recorded values.', ''],
  ]
  return { name: 'Overview', rows, money: [], widths: [40, 44] }
}

export function buildSheets(input: ExportInput): ExportSheet[] {
  return [overviewSheet(input), cellarSheet(input), historySheet(input), wishlistSheet(input)]
}

// ---- writers ----

/** RFC 4180 CSV of the cellar sheet, UTF-8 with BOM so Excel keeps accents. */
export function cellarCSV(input: ExportInput): string {
  const esc = (c: Cell) => {
    if (c == null) return ''
    const s = String(c)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + cellarSheet(input).rows.map((r) => r.map(esc).join(',')).join('\r\n')
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function exportCellarCSV(input: ExportInput) {
  download(new Blob([cellarCSV(input)], { type: 'text/csv;charset=utf-8' }), `winesnob-cellar-${today()}.csv`)
}

// ---- insurance schedule ----

export interface InsuranceInput extends ExportInput {
  policy: Policy | null
  attestation: Attestation | null
  /** Resolves a bottle's photograph to a displayable URL (signed or data). */
  photoUrl?: (b: Bottle) => string | undefined
}

const BASIS_TEXT =
  'Values are live market prices from merchant and auction listings where available, with the pricing source and date recorded per item; positions without a credible market read stand at their recorded value. This document is an inventory and market-value statement prepared from the collector’s cellar records. It is not a certified appraisal.'

const dmy = (iso?: string | null) => (iso ? iso.slice(0, 10) : '')

function heldBottles(input: ExportInput): Bottle[] {
  const order = new Map(input.cellars.map((c, i) => [c.id, i]))
  return input.bottles
    .filter((b) => b.quantity > 0)
    .sort((a, b) => (order.get(a.cellarId) ?? 9) - (order.get(b.cellarId) ?? 9) || a.name.localeCompare(b.name))
}

/** The insurance cover: policy facts, totals, basis, attestation citation. */
export function insuranceCoverSheet(input: InsuranceInput): ExportSheet {
  const st = insuranceStatus(input.bottles, input.policy)
  const rows: Cell[][] = [
    ['WineSnob insurance schedule', ''],
    ['Prepared', today()],
    ['Policyholder', `${input.accountName} (${input.accountEmail})`],
    ['', ''],
    ['Insurer', input.policy?.insurer || 'not recorded'],
    ['Declared sum', st.declared != null ? eur(st.declared) : 'not recorded'],
    ['Per-item limit', input.policy?.itemLimit ? eur(input.policy.itemLimit) : 'not recorded'],
    ['Policy renews', input.policy?.renewal || 'not recorded'],
    ['', ''],
    ['Positions', st.totalPositions],
    ['Bottles', input.bottles.reduce((s, b) => s + (b.quantity > 0 ? b.quantity : 0), 0)],
    ['Current value', eur(st.current)],
    ...(st.gap != null
      ? [[st.gap > 0 ? 'Underinsured by' : 'Headroom under declared sum', eur(Math.abs(st.gap))] as Cell[]]
      : []),
    ['Market-priced positions', `${st.pricedPositions} of ${st.totalPositions}${st.latestValuation ? ` (latest ${dmy(st.latestValuation)})` : ''}`],
    ...(st.overLimit.length
      ? [[`Items above the per-item limit`, `${st.overLimit.length} (see High-value items)`] as Cell[]]
      : []),
    ['', ''],
    ...(input.attestation
      ? [
          ['Sealed record', `${attestationNumber(input.attestation.seq)} of ${dmy(input.attestation.createdAt)}`] as Cell[],
          ['SHA-256', input.attestation.sha256] as Cell[],
          ['', ''] as Cell[],
        ]
      : []),
    ['Basis of valuation', BASIS_TEXT],
  ]
  return { name: 'Statement', rows, money: [], widths: [30, 70] }
}

/** One row per position, in the shape a broker expects. */
export function insuranceScheduleSheet(input: InsuranceInput): ExportSheet {
  const cellarName = new Map(input.cellars.map((c) => [c.id, c.name]))
  const rows: Cell[][] = [
    ['Cellar', 'Wine', 'Producer', 'Vintage', 'Format', 'Bottles', 'Region', 'Country',
      'Acquired price / bottle', 'Value / bottle', 'Position value', 'Basis', 'Priced by', 'Priced on', 'Photograph'],
  ]
  for (const b of heldBottles(input)) {
    const market = hasMarketValue(b)
    rows.push([
      cellarName.get(b.cellarId) ?? b.cellarId, b.name, b.producer, b.vintage,
      fmtDef(b.format).label, b.quantity, b.region, b.country,
      b.paid != null && b.paid > 0 ? b.paid : null,
      round2(unitValueNow(b)), round2(bottleValue(b)),
      market ? 'market' : 'recorded',
      market ? (b.marketSource ?? '') : '', market ? dmy(b.marketAsOf) : '',
      b.photo ? 'yes' : '',
    ])
  }
  return {
    name: 'Schedule',
    rows,
    money: [8, 9, 10],
    widths: [12, 30, 26, 8, 12, 8, 22, 10, 15, 13, 14, 10, 16, 11, 11],
  }
}

/** Items whose per-bottle value exceeds the policy's per-item limit. */
export function highValueSheet(input: InsuranceInput): ExportSheet | null {
  const st = insuranceStatus(input.bottles, input.policy)
  if (!input.policy?.itemLimit || !st.overLimit.length) return null
  const rows: Cell[][] = [
    ['Wine', 'Producer', 'Vintage', 'Format', 'Value / bottle', 'Bottles', 'Position value', 'Basis', 'Priced by', 'Priced on'],
  ]
  for (const b of st.overLimit) {
    rows.push([
      b.name, b.producer, b.vintage, fmtDef(b.format).label,
      round2(unitValueNow(b)), b.quantity, round2(bottleValue(b)),
      hasMarketValue(b) ? 'market' : 'recorded',
      b.marketSource ?? '', dmy(b.marketAsOf),
    ])
  }
  rows.push([])
  rows.push([`Each item above exceeds the per-item limit of ${eur(input.policy.itemLimit)} and is typically scheduled individually.`])
  return { name: 'High-value items', rows, money: [4, 6], widths: [30, 26, 8, 12, 14, 8, 14, 10, 16, 11] }
}

export async function exportInsuranceWorkbook(input: InsuranceInput) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const sheets = [insuranceCoverSheet(input), insuranceScheduleSheet(input), highValueSheet(input)].filter(
    (s): s is ExportSheet => !!s,
  )
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows)
    ws['!cols'] = sheet.widths.map((wch) => ({ wch }))
    for (const c of sheet.money) {
      for (let r = 1; r < sheet.rows.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        if (cell && typeof cell.v === 'number') cell.z = '#,##0.00 "€"'
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  download(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `winesnob-insurance-${today()}.xlsx`
  )
}

// ---- the typeset statement (browser print, saves to PDF) ----

const escapeHtml = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const STATEMENT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Figtree:wght@400;500;600&display=swap');
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Figtree', system-ui, sans-serif; color: #26221c; font-size: 10.5px; line-height: 1.5; }
h1, h2, .wordmark { font-family: 'Spectral', Georgia, serif; font-weight: 500; }
.wordmark { font-size: 13px; letter-spacing: 0.34em; text-transform: uppercase; color: #5d1a28; }
h1 { font-size: 26px; margin: 6px 0 2px; }
.kicker { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #8a8375; }
.cover { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 28px; margin: 22px 0 6px; }
.block h3 { font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: #8a8375; font-weight: 600; margin-bottom: 6px; }
.block .line { display: flex; justify-content: space-between; gap: 12px; padding: 3.5px 0; border-bottom: 0.5px solid #e5dfd2; }
.block .line span:last-child { font-weight: 600; text-align: right; }
.hero { font-family: 'Spectral', Georgia, serif; font-size: 30px; }
.gap-warn { color: #5d1a28; font-weight: 600; }
.gap-ok { color: #274d3d; font-weight: 600; }
.basis { color: #6d675c; }
.basis-note { margin: 14px 0 4px; padding: 10px 12px; border: 0.5px solid #e5dfd2; background: #faf7f0; color: #57524a; font-size: 9.5px; }
.attest { margin-top: 8px; font-size: 9.5px; color: #57524a; }
.attest code { font-family: ui-monospace, Menlo, monospace; font-size: 8px; word-break: break-all; }
h2 { font-size: 17px; margin: 26px 0 8px; page-break-after: avoid; }
table { width: 100%; border-collapse: collapse; }
th { font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #8a8375; text-align: left; padding: 5px 6px; border-bottom: 0.5px solid #26221c; }
td { padding: 4.5px 6px; border-bottom: 0.5px solid #e5dfd2; vertical-align: top; }
tr { page-break-inside: avoid; }
td.num, th.num { text-align: right; white-space: nowrap; }
td.strong { font-weight: 600; }
td.wine { font-weight: 500; }
td.wine .sub { display: block; font-weight: 400; color: #8a8375; font-size: 9px; }
td.basis { color: #6d675c; white-space: nowrap; }
.hv { display: flex; gap: 12px; border: 0.5px solid #e5dfd2; padding: 10px; margin-bottom: 10px; page-break-inside: avoid; align-items: center; }
.hv img { width: 52px; height: 68px; object-fit: cover; border: 0.5px solid #e5dfd2; }
.hv-noimg { width: 52px; height: 68px; border: 0.5px dashed #cfc8b8; color: #a09a8c; font-size: 7.5px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 4px; }
.hv-name { font-family: 'Spectral', Georgia, serif; font-size: 14px; }
.hv-sub { color: #8a8375; font-size: 9.5px; }
.hv-val { margin-top: 3px; font-weight: 600; }
.hv-basis { color: #6d675c; font-size: 9px; }
.foot { margin-top: 24px; padding-top: 8px; border-top: 0.5px solid #e5dfd2; color: #a09a8c; font-size: 8.5px; display: flex; justify-content: space-between; }
`

export function insuranceStatementHTML(input: InsuranceInput): string {
  const st = insuranceStatus(input.bottles, input.policy)
  const cellarName = new Map(input.cellars.map((c) => [c.id, c.name]))
  const held = heldBottles(input)
  const bottleCount = held.reduce((s, b) => s + b.quantity, 0)
  const e = escapeHtml

  const scheduleRows = held
    .map((b) => {
      const market = hasMarketValue(b)
      return `<tr>
        <td>${e(cellarName.get(b.cellarId) ?? b.cellarId)}</td>
        <td class="wine">${e(b.name)}<span class="sub">${e(b.producer)}</span></td>
        <td>${e(b.vintage)}</td>
        <td>${e(fmtDef(b.format).label)}</td>
        <td class="num">${b.quantity}</td>
        <td class="num">${b.paid != null && b.paid > 0 ? e(eur(b.paid)) : '–'}</td>
        <td class="num">${e(eur(unitValueNow(b)))}</td>
        <td class="num strong">${e(eur(bottleValue(b)))}</td>
        <td class="basis">${market ? `market · ${e(dmy(b.marketAsOf))}` : 'recorded'}</td>
      </tr>`
    })
    .join('')

  const annex = st.overLimit
    .map((b) => {
      const url = input.photoUrl?.(b)
      return `<div class="hv">
        ${url ? `<img src="${e(url)}" alt="" />` : '<div class="hv-noimg">No photograph on file</div>'}
        <div class="hv-body">
          <div class="hv-name">${e(b.name)} ${e(b.vintage)}</div>
          <div class="hv-sub">${e(b.producer)} · ${e(fmtDef(b.format).label)} · ${b.quantity} ${b.quantity === 1 ? 'bottle' : 'bottles'}</div>
          <div class="hv-val">${e(eur(unitValueNow(b)))} per bottle · position ${e(eur(bottleValue(b)))}</div>
          <div class="hv-basis">${hasMarketValue(b) ? `Market price · ${e(b.marketSource || '')} · ${e(dmy(b.marketAsOf))}` : 'Recorded value'}</div>
        </div>
      </div>`
    })
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8"><title>WineSnob insurance statement</title>
<style>${STATEMENT_CSS}</style></head><body>
<div class="wordmark">WineSnob</div>
<div class="kicker">Statement of insurable inventory</div>
<h1>${e(input.accountName)}</h1>
<div class="basis">Prepared ${today()} for ${e(input.accountEmail)}</div>

<div class="cover">
  <div class="block">
    <h3>The cellar</h3>
    <div class="line"><span>Current value</span><span class="hero">${e(eur(st.current))}</span></div>
    <div class="line"><span>Positions</span><span>${st.totalPositions}</span></div>
    <div class="line"><span>Bottles</span><span>${bottleCount}</span></div>
    <div class="line"><span>Market-priced</span><span>${st.pricedPositions} of ${st.totalPositions}${st.latestValuation ? ` · latest ${e(dmy(st.latestValuation))}` : ''}</span></div>
  </div>
  <div class="block">
    <h3>The policy</h3>
    <div class="line"><span>Insurer</span><span>${e(input.policy?.insurer || 'not recorded')}</span></div>
    <div class="line"><span>Declared sum</span><span>${st.declared != null ? e(eur(st.declared)) : 'not recorded'}</span></div>
    ${st.gap != null ? `<div class="line"><span>${st.gap > 0 ? 'Underinsured by' : 'Headroom'}</span><span class="${st.gap > 0 ? 'gap-warn' : 'gap-ok'}">${e(eur(Math.abs(st.gap)))}</span></div>` : ''}
    <div class="line"><span>Per-item limit</span><span>${input.policy?.itemLimit ? e(eur(input.policy.itemLimit)) : 'not recorded'}</span></div>
    <div class="line"><span>Renews</span><span>${e(input.policy?.renewal || 'not recorded')}</span></div>
  </div>
</div>

${input.attestation ? `<div class="attest">Cited sealed record ${e(attestationNumber(input.attestation.seq))} of ${e(dmy(input.attestation.createdAt))}, ${input.attestation.positions} positions, ${e(eur(input.attestation.totalValue))}.<br/>SHA-256 <code>${e(input.attestation.sha256)}</code></div>` : ''}

<div class="basis-note">${e(BASIS_TEXT)}</div>

<h2>Schedule</h2>
<table>
  <thead><tr><th>Cellar</th><th>Wine</th><th>Vintage</th><th>Format</th><th class="num">Bottles</th><th class="num">Acquired</th><th class="num">Per bottle</th><th class="num">Position</th><th>Basis</th></tr></thead>
  <tbody>${scheduleRows}</tbody>
</table>

${
  st.overLimit.length && input.policy?.itemLimit
    ? `<h2>High-value items</h2>
<div class="basis" style="margin-bottom:10px">Each item exceeds the per-item limit of ${e(eur(input.policy.itemLimit))} and is typically scheduled individually with the insurer.</div>
${annex}`
    : ''
}

<div class="foot"><span>Prepared with WineSnob</span><span>${today()}</span></div>
</body></html>`
}

// ---- retrospective documents from a sealed record ----
// Built STRICTLY from the frozen snapshot: no live cellar data, and no
// photographs (pixels were never part of the hash, so they do not belong
// in a document that claims to reproduce the record exactly as sealed).

export interface SealedDocInput {
  detail: AttestationDetail
  accountName: string
  accountEmail: string
}

const SEALED_TEXT = (num: string, dayStr: string) =>
  `This document reproduces sealed record ${num} exactly as recorded on ${dayStr}. The record is stored append-only; the database rejects any change or deletion, and its SHA-256 fingerprint above can be recomputed from the stored snapshot at any time. ${BASIS_TEXT}`

export function sealedStatementHTML(inp: SealedDocInput): string {
  const { detail } = inp
  const e = escapeHtml
  const num = attestationNumber(detail.seq)
  const sealedDay = dmy(detail.createdAt)
  const rows = detail.schedule
    .map(
      (p) => `<tr>
        <td>${e(p.cellar)}</td>
        <td class="wine">${e(p.name)}<span class="sub">${e(p.producer)}</span></td>
        <td>${e(p.vintage)}</td>
        <td>${e(fmtDef(p.format).label)}</td>
        <td class="num">${p.quantity}</td>
        <td class="num">${p.paid != null && p.paid > 0 ? e(eur(p.paid)) : '–'}</td>
        <td class="num">${e(eur(p.itemValue))}</td>
        <td class="num strong">${e(eur(p.positionValue))}</td>
        <td class="basis">${p.basis === 'market' ? `market · ${e(dmy(p.marketAsOf))}` : 'recorded'}</td>
      </tr>`,
    )
    .join('')
  const pol = detail.policy
  return `<!doctype html><html><head><meta charset="utf-8"><title>WineSnob sealed record ${e(num)}</title>
<style>${STATEMENT_CSS}</style></head><body>
<div class="wordmark">WineSnob</div>
<div class="kicker">Sealed inventory record · ${e(num)}</div>
<h1>${e(inp.accountName)}</h1>
<div class="basis">Sealed ${e(sealedDay)} · prepared for ${e(inp.accountEmail)}${detail.note ? ` · ${e(detail.note)}` : ''}</div>

<div class="cover">
  <div class="block">
    <h3>The record</h3>
    <div class="line"><span>Value at seal</span><span class="hero">${e(eur(detail.totalValue))}</span></div>
    <div class="line"><span>Positions</span><span>${detail.schedule.length}</span></div>
    <div class="line"><span>Bottles</span><span>${detail.bottles}</span></div>
    <div class="line"><span>Sealed</span><span>${e(sealedDay)}</span></div>
  </div>
  <div class="block">
    <h3>The policy at seal time</h3>
    <div class="line"><span>Insurer</span><span>${e(pol?.insurer || 'not recorded')}</span></div>
    <div class="line"><span>Declared sum</span><span>${pol?.declared != null ? e(eur(pol.declared)) : 'not recorded'}</span></div>
    <div class="line"><span>Per-item limit</span><span>${pol?.itemLimit != null ? e(eur(pol.itemLimit)) : 'not recorded'}</span></div>
    <div class="line"><span>Renews</span><span>${e(pol?.renewal || 'not recorded')}</span></div>
  </div>
</div>

<div class="attest">SHA-256 <code>${e(detail.sha256)}</code></div>
<div class="basis-note">${e(SEALED_TEXT(num, sealedDay))}</div>

<h2>Schedule as sealed</h2>
<table>
  <thead><tr><th>Cellar</th><th>Wine</th><th>Vintage</th><th>Format</th><th class="num">Bottles</th><th class="num">Acquired</th><th class="num">Per bottle</th><th class="num">Position</th><th>Basis</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<div class="foot"><span>Prepared with WineSnob · sealed record ${e(num)}</span><span>${today()}</span></div>
</body></html>`
}

export function printSealedStatement(inp: SealedDocInput) {
  printHTML(sealedStatementHTML(inp))
}

export async function exportSealedWorkbook(inp: SealedDocInput) {
  const { detail } = inp
  const num = attestationNumber(detail.seq)
  const pol = detail.policy
  const cover: ExportSheet = {
    name: 'Sealed record',
    rows: [
      ['WineSnob sealed inventory record', ''],
      ['Record', num],
      ['Sealed', dmy(detail.createdAt)],
      ['Policyholder', `${inp.accountName} (${inp.accountEmail})`],
      ...(detail.note ? [['Note', detail.note] as Cell[]] : []),
      ['', ''],
      ['Positions', detail.schedule.length],
      ['Bottles', detail.bottles],
      ['Value at seal', eur(detail.totalValue)],
      ['', ''],
      ['Insurer at seal time', pol?.insurer || 'not recorded'],
      ['Declared sum', pol?.declared != null ? eur(pol.declared) : 'not recorded'],
      ['Per-item limit', pol?.itemLimit != null ? eur(pol.itemLimit) : 'not recorded'],
      ['', ''],
      ['SHA-256', detail.sha256],
      ['About this record', SEALED_TEXT(num, dmy(detail.createdAt))],
    ],
    money: [],
    widths: [30, 70],
  }
  const schedule: ExportSheet = {
    name: 'Schedule as sealed',
    rows: [
      ['Cellar', 'Wine', 'Producer', 'Vintage', 'Format', 'Bottles', 'Region', 'Country',
        'Acquired price / bottle', 'Value / bottle', 'Position value', 'Basis', 'Priced by', 'Priced on'],
      ...detail.schedule.map((p): Cell[] => [
        p.cellar, p.name, p.producer, p.vintage, fmtDef(p.format).label, p.quantity, p.region, p.country,
        p.paid != null && p.paid > 0 ? p.paid : null, p.itemValue, p.positionValue,
        p.basis, p.marketSource ?? '', dmy(p.marketAsOf),
      ]),
    ],
    money: [8, 9, 10],
    widths: [12, 30, 26, 8, 12, 8, 22, 10, 15, 13, 14, 10, 16, 11],
  }
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const sheet of [cover, schedule]) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows)
    ws['!cols'] = sheet.widths.map((wch) => ({ wch }))
    for (const c of sheet.money) {
      for (let r = 1; r < sheet.rows.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        if (cell && typeof cell.v === 'number') cell.z = '#,##0.00 "€"'
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  download(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `winesnob-sealed-${num}.xlsx`
  )
}

/** Open the statement in a hidden frame and hand it to the browser's print
 * dialog, where it saves as a clean PDF. */
export function printInsuranceStatement(input: InsuranceInput) {
  printHTML(insuranceStatementHTML(input))
}

// ---- billing statement documents ----
// Customer-sendable: only BILLED amounts appear. Cost and markup live in the
// admin console, never in the document.

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** A line's billed amount; statements from before markups bill at cost. */
function lineBilled(st: BillingStatement, l: { usd: number; billed?: number }): number {
  return l.billed ?? Math.round(l.usd * Number(st.markup ?? 1) * 100) / 100
}

export function usageStatementHTML(st: BillingStatement): string {
  const e = escapeHtml
  const num = statementNumber(st.seq)
  const billedTotal = Number(st.billed_usd ?? st.total_usd)
  const rows = (st.lines || [])
    .map(
      (l) => `<tr>
        <td class="wine">${e(fnLabel(l.fn))}</td>
        <td class="num">${l.calls}</td>
        <td class="num">${(l.input_tokens + l.output_tokens).toLocaleString('en-US')}</td>
        <td class="num">${l.searches || '–'}</td>
        <td class="num strong">${e(usd(lineBilled(st, l)))}</td>
      </tr>`,
    )
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>WineSnob statement ${e(num)}</title>
<style>${STATEMENT_CSS}</style></head><body>
<div class="wordmark">WineSnob</div>
<div class="kicker">Usage statement · ${e(num)}</div>
<h1>${e(st.user_email || 'Member account')}</h1>
<div class="basis">Period ${e(dmy(st.period_start))} to ${e(dmy(st.period_end))} · locked ${e(dmy(st.created_at))}${st.note ? ` · ${e(st.note)}` : ''}</div>

<div class="cover">
  <div class="block">
    <h3>Amount due</h3>
    <div class="line"><span>Total</span><span class="hero">${e(usd(billedTotal))}</span></div>
  </div>
  <div class="block">
    <h3>The period</h3>
    <div class="line"><span>AI requests</span><span>${st.calls}</span></div>
    <div class="line"><span>Tokens processed</span><span>${(st.input_tokens + st.output_tokens).toLocaleString('en-US')}</span></div>
    <div class="line"><span>Live web searches</span><span>${st.searches}</span></div>
  </div>
</div>

<h2>Services</h2>
<table>
  <thead><tr><th>Service</th><th class="num">Requests</th><th class="num">Tokens</th><th class="num">Searches</th><th class="num">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<div class="basis-note">This is an informal usage statement prepared by WineSnob, locked as record ${e(num)} on ${e(dmy(st.created_at))}. Settled statements are permanent: the underlying record can never be altered or deleted.</div>

<div class="foot"><span>Prepared with WineSnob · ${e(num)}</span><span>${today()}</span></div>
</body></html>`
}

export function printUsageStatement(st: BillingStatement) {
  printHTML(usageStatementHTML(st))
}

export async function exportUsageStatementWorkbook(st: BillingStatement) {
  const num = statementNumber(st.seq)
  const sheet: ExportSheet = {
    name: 'Statement',
    rows: [
      ['WineSnob usage statement', ''],
      ['Statement', num],
      ['Account', st.user_email || ''],
      ['Period', `${dmy(st.period_start)} to ${dmy(st.period_end)}`],
      ['Locked', dmy(st.created_at)],
      ...(st.note ? [['Note', st.note] as Cell[]] : []),
      ['', ''],
      ['AI requests', st.calls],
      ['Tokens processed', st.input_tokens + st.output_tokens],
      ['Live web searches', st.searches],
      ['', ''],
      ['Service', 'Amount ($)'],
      ...(st.lines || []).map((l): Cell[] => [`${fnLabel(l.fn)} (${l.calls} ${l.calls === 1 ? 'request' : 'requests'})`, lineBilled(st, l)]),
      ['', ''],
      ['Total due', Number(st.billed_usd ?? st.total_usd)],
    ],
    money: [1],
    widths: [40, 22],
  }
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(sheet.rows)
  ws['!cols'] = sheet.widths.map((wch) => ({ wch }))
  for (let r = 1; r < sheet.rows.length; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 1 })]
    if (cell && typeof cell.v === 'number') cell.z = '#,##0.00 "$"'
  }
  XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  download(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `winesnob-statement-${num}.xlsx`
  )
}

function printHTML(html: string) {
  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()
  const fire = () => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } finally {
      // Give the print dialog time to take its snapshot before removal.
      setTimeout(() => frame.remove(), 60000)
    }
  }
  // Let fonts and photographs settle so the first page prints complete.
  const imgs = Array.from(doc.images)
  void Promise.allSettled(imgs.map((i) => (i.decode ? i.decode() : Promise.resolve()))).then(() =>
    setTimeout(fire, 350),
  )
}

export async function exportWorkbook(input: ExportInput) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const sheet of buildSheets(input)) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows)
    ws['!cols'] = sheet.widths.map((wch) => ({ wch }))
    for (const c of sheet.money) {
      for (let r = 1; r < sheet.rows.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        if (cell && typeof cell.v === 'number') cell.z = '#,##0.00 "€"'
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  download(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `winesnob-cellar-${today()}.xlsx`
  )
}
