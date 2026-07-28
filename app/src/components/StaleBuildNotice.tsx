import { useEffect, useState } from 'react'
import { CANONICAL_ORIGIN, checkStaleness, type Staleness } from '@/lib/version'

/**
 * A quiet, unmissable line at the foot of the app when this running copy is
 * not the current build: an update-pending reload on the canonical domain,
 * or the honest truth when the copy was installed from a frozen deployment
 * URL and can never update itself.
 */
export function StaleBuildNotice() {
  const [state, setState] = useState<Staleness>('current')

  useEffect(() => {
    let last = 0
    const run = () => {
      const now = Date.now()
      if (now - last < 300000) return
      last = now
      void checkStaleness().then(setState)
    }
    run()
    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', run)
    return () => {
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', run)
    }
  }, [])

  if (state === 'current') return null
  const pinned = state === 'pinned-old-copy'
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 340,
        background: 'var(--ws-bordeaux)',
        color: 'var(--ws-cream)',
        padding: '12px max(16px, env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        fontFamily: 'var(--ws-font-ui)',
        fontSize: 13.5,
        lineHeight: 1.4,
      }}
    >
      <span>{pinned ? 'You are viewing an outdated copy of WineSnob.' : 'A new version of WineSnob is ready.'}</span>
      {pinned ? (
        <a href={CANONICAL_ORIGIN} style={{ color: 'var(--ws-cream)', fontWeight: 600, textDecoration: 'underline' }}>
          Open wine-snob.vercel.app
        </a>
      ) : (
        <button
          onClick={() => window.location.reload()}
          style={{ background: 'var(--ws-cream)', color: 'var(--ws-bordeaux)', border: 0, borderRadius: 999, padding: '6px 14px', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}
        >
          Reload
        </button>
      )}
    </div>
  )
}
