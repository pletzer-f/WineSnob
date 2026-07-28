// WineSnob — build identity and staleness. Every build bakes its id in and
// the canonical domain publishes the current one at /version.json (never
// precached). A client comparing the two can tell WHERE it stands:
//   * same origin, older build: a normal update is pending, reload fixes it.
//   * DIFFERENT origin, older build: the app was installed or bookmarked
//     from a frozen deployment URL and can never update; only opening the
//     canonical domain fixes it. This is the failure that kept the owner's
//     console on a museum build for a day.

declare const __BUILD_ID__: string

export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'

export const CANONICAL_ORIGIN = 'https://wine-snob.vercel.app'

export type Staleness = 'current' | 'update-ready' | 'pinned-old-copy'

/** Compare this running copy to the canonical build. Quiet on any failure:
 * a staleness check must never take the app down. */
export async function checkStaleness(): Promise<Staleness> {
  if (BUILD_ID === 'dev' || window.location.hostname === 'localhost') return 'current'
  try {
    const res = await fetch(`${CANONICAL_ORIGIN}/version.json`, { cache: 'no-store' })
    if (!res.ok) return 'current'
    const { build } = (await res.json()) as { build?: string }
    if (!build || build === 'dev' || build === BUILD_ID) return 'current'
    return window.location.origin === CANONICAL_ORIGIN ? 'update-ready' : 'pinned-old-copy'
  } catch {
    return 'current'
  }
}
