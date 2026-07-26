// WineSnob — insurance. The tier is admin-granted (entitlements table, no
// user-facing writes); attestations are sealed by a server-side RPC that
// reads the caller's own bottles, so the record cannot be forged; and the
// status arithmetic here is pure so the hub and the exports agree.

import { hasSupabase, supabase } from '@/lib/supabase'
import { bottleValue, hasMarketValue, unitValueNow } from '@/domain/valuation'
import type { Bottle, Policy } from '@/domain/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export interface Attestation {
  id: string
  seq: number
  createdAt: string
  positions: number
  bottles: number
  totalValue: number
  sha256: string
  note: string | null
}

export function attestationNumber(seq: number): string {
  return `WS-INV-${String(seq).padStart(4, '0')}`
}

/** Whether this account holds the insurance tier. Demo mode is entitled so
 * the hub is explorable offline. */
export async function fetchInsuranceEntitled(): Promise<boolean> {
  if (!hasSupabase) return true
  try {
    const { data } = await db.from('entitlements').select('insurance').maybeSingle()
    return !!(data as { insurance?: boolean } | null)?.insurance
  } catch {
    return false
  }
}

const attFromRow = (r: any): Attestation => ({
  id: r.id,
  seq: Number(r.seq),
  createdAt: r.created_at,
  positions: r.positions,
  bottles: r.bottles,
  totalValue: Number(r.total_value),
  sha256: r.sha256,
  note: r.note ?? null,
})

export async function listAttestations(): Promise<Attestation[]> {
  if (!hasSupabase) return demoAttestations.slice()
  const { data, error } = await db
    .from('inventory_attestations')
    .select('id,seq,created_at,positions,bottles,total_value,sha256,note')
    .order('created_at', { ascending: false })
    .limit(24)
  if (error) throw new Error(error.message)
  return ((data as any[]) || []).map(attFromRow)
}

/** Seal the inventory as it stands. The server reads the bottles itself. */
export async function sealInventory(note?: string): Promise<Attestation> {
  if (!hasSupabase) {
    const a: Attestation = {
      id: `demo-att-${demoAttestations.length + 1}`,
      seq: demoAttestations.length ? demoAttestations[0].seq + 1 : 7,
      createdAt: new Date().toISOString(),
      positions: 12,
      bottles: 48,
      totalValue: 34738,
      sha256: 'b1c4a89e0e4b2f3a5d6c7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
      note: note || null,
    }
    demoAttestations.unshift(a)
    return a
  }
  const { data, error } = await db.rpc('create_inventory_attestation', { p_note: note || null })
  if (error) throw new Error(error.message)
  return attFromRow(data)
}

const demoAttestations: Attestation[] = [
  {
    id: 'demo-att-0',
    seq: 6,
    createdAt: '2026-06-30T09:12:00Z',
    positions: 12,
    bottles: 46,
    totalValue: 33920,
    sha256: 'a3f2b18c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
    note: 'Half-year record',
  },
]

// ---- pure status arithmetic (the hub and the exports both read this) ----

export interface InsuranceStatus {
  /** Current market-preferred value of everything held. */
  current: number
  /** Declared sum from the policy, when entered. */
  declared: number | null
  /** current - declared: positive means underinsured. */
  gap: number | null
  /** Positions whose per-bottle value exceeds the policy's per-item limit. */
  overLimit: Bottle[]
  /** Most recent market valuation date across the cellar, if any. */
  latestValuation: string | null
  pricedPositions: number
  totalPositions: number
  /** Documentation gaps that weaken a claim. */
  missingPaid: number
  missingPhoto: number
  /** Days until the policy renews (negative = past), when entered. */
  renewalInDays: number | null
}

export function insuranceStatus(bottles: Bottle[], policy: Policy | null, now = new Date()): InsuranceStatus {
  const held = bottles.filter((b) => b.quantity > 0)
  const current = held.reduce((sum, b) => sum + bottleValue(b), 0)
  const declared = policy?.declared != null && policy.declared > 0 ? policy.declared : null
  const limit = policy?.itemLimit != null && policy.itemLimit > 0 ? policy.itemLimit : null
  const overLimit = limit
    ? held.filter((b) => unitValueNow(b) > limit).sort((a, b) => unitValueNow(b) - unitValueNow(a))
    : []
  let latest: string | null = null
  for (const b of held) {
    if (hasMarketValue(b) && b.marketAsOf && (!latest || b.marketAsOf > latest)) latest = b.marketAsOf
  }
  let renewalInDays: number | null = null
  if (policy?.renewal) {
    const r = new Date(`${policy.renewal}T00:00:00`)
    renewalInDays = Math.ceil((r.getTime() - now.getTime()) / 86400000)
  }
  return {
    current,
    declared,
    gap: declared != null ? current - declared : null,
    overLimit,
    latestValuation: latest,
    pricedPositions: held.filter(hasMarketValue).length,
    totalPositions: held.length,
    missingPaid: held.filter((b) => b.paid == null || b.paid <= 0).length,
    missingPhoto: held.filter((b) => !b.photo).length,
    renewalInDays,
  }
}
