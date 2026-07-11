// WineSnob — cellar export. The workbook data is built once by pure
// functions, then handed to either the plain CSV writer or SheetJS for a
// real .xlsx. SheetJS is imported lazily so it never weighs down the app
// bundle; it only loads the moment an export is requested.

import type { Bottle, Cellar, Drink, Wish } from '@/domain/types'
import { bottleValue, hasMarketValue } from '@/domain/valuation'
import { costBasis, totalReturn } from '@/domain/portfolio'

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
