import React from 'react'

export type CaptureMode = 'label' | 'case' | 'voice'

export interface CaptureBarProps {
  /** Active capture mode. */
  mode?: CaptureMode
  /** Called when the user switches mode. */
  onModeChange?: (mode: CaptureMode) => void
  /** Called when the shutter is pressed. */
  onCapture?: () => void
  className?: string
}

const MODES: { key: CaptureMode; label: string; hint: string }[] = [
  { key: 'label', label: 'Label', hint: 'Point at the bottle label.' },
  { key: 'case', label: 'Case', hint: 'Snap a case end-panel — adds the whole case.' },
  { key: 'voice', label: 'Voice', hint: '“Lafite 2016, three bottles.”' },
]

/**
 * The add-a-bottle capture control. Switch between snapping a label, a case
 * end-panel, or speaking, then tap the shutter to capture. The hero of the
 * onboarding flow — built for rapid, repeated capture down a rack.
 */
export function CaptureBar({ mode = 'label', onModeChange, onCapture, className }: CaptureBarProps) {
  const cls = ['ws-capture', className].filter(Boolean).join(' ')
  const active = MODES.find((m) => m.key === mode) ?? MODES[0]
  return (
    <div className={cls}>
      <div className="ws-capture__modes" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`ws-capture__mode${m.key === mode ? ' ws-capture__mode--active' : ''}`}
            aria-selected={m.key === mode}
            onClick={() => onModeChange?.(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <button type="button" className="ws-capture__shutter" aria-label="Capture" onClick={onCapture}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
          <circle cx="12" cy="13" r="3.4" />
        </svg>
      </button>
      <span className="ws-capture__hint">{active.hint}</span>
    </div>
  )
}
