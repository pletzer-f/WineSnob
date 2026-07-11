// WineSnob — label photographs. Scans are kept, not discarded: a full-size
// (1568px) and a thumbnail (480px) JPEG live in the private `labels` bucket
// under "{userId}/{bottleId}-full.jpg" / "-thumb.jpg" (per-user folder
// policies from migration 0002 guard access). The app displays them through
// short-lived signed URLs, re-minted on each load. In demo mode the photo
// field holds a small data URL instead, so everything works offline.

import { hasSupabase, supabase } from '@/lib/supabase'
import type { Bottle } from '@/domain/types'

export interface LabelUrls {
  thumb: string
  full: string
}

const SIGN_TTL = 60 * 60 * 24 * 6 // six days; re-signed on every app open

const fullPath = (userId: string, bottleId: string) => `${userId}/${bottleId}-full.jpg`
const thumbPath = (path: string) => path.replace(/-full\.jpg$/, '-thumb.jpg')

/** True when the photo field is directly displayable (demo data URL). */
export const isInlinePhoto = (photo?: string) => !!photo && /^(data:|blob:|https?:)/.test(photo)

function drawToJpeg(file: File, maxEdge: number, quality: number, as: 'blob' | 'dataurl'): Promise<Blob | string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas unavailable'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      if (as === 'dataurl') return resolve(canvas.toDataURL('image/jpeg', quality))
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo.'))), 'image/jpeg', quality)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that photo.'))
    }
    img.src = url
  })
}

/** Small data URL used as the photo in demo mode (fits in localStorage). */
export function demoPhotoDataUrl(file: File): Promise<string> {
  return drawToJpeg(file, 480, 0.72, 'dataurl') as Promise<string>
}

/** Upload full + thumb for one bottle; returns the storage path and fresh
 * signed URLs so the UI can show the photo immediately. */
export async function uploadLabelPhoto(userId: string, bottleId: string, file: File): Promise<{ path: string; urls: LabelUrls }> {
  const [full, thumb] = (await Promise.all([
    drawToJpeg(file, 1568, 0.82, 'blob'),
    drawToJpeg(file, 480, 0.72, 'blob'),
  ])) as [Blob, Blob]
  const path = fullPath(userId, bottleId)
  const store = supabase.storage.from('labels')
  const opts = { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' }
  const [rFull, rThumb] = await Promise.all([
    store.upload(path, full, opts),
    store.upload(thumbPath(path), thumb, opts),
  ])
  if (rFull.error) throw rFull.error
  if (rThumb.error) throw rThumb.error
  const signed = await signLabelUrls([path])
  const urls = signed[path]
  if (!urls) throw new Error('Could not prepare the photo for display.')
  return { path, urls }
}

/** Batch-sign display URLs for a set of full-photo storage paths. */
export async function signLabelUrls(paths: string[]): Promise<Record<string, LabelUrls>> {
  if (!hasSupabase || paths.length === 0) return {}
  const all = [...paths, ...paths.map(thumbPath)]
  const { data, error } = await supabase.storage.from('labels').createSignedUrls(all, SIGN_TTL)
  if (error || !data) return {}
  const byPath = new Map(data.filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl]))
  const out: Record<string, LabelUrls> = {}
  for (const p of paths) {
    const full = byPath.get(p)
    if (full) out[p] = { full, thumb: byPath.get(thumbPath(p)) || full }
  }
  return out
}

/** Sign URLs for every bottle that carries a stored photo path. */
export function signBottlePhotos(bottles: Bottle[]): Promise<Record<string, LabelUrls>> {
  const paths = bottles.filter((b) => b.photo && !isInlinePhoto(b.photo)).map((b) => b.photo!)
  return signLabelUrls([...new Set(paths)])
}
