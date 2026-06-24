import React from 'react'

export interface NumberStepperProps {
  /** Current value. */
  value: number
  /** Minimum allowed. */
  min?: number
  /** Maximum allowed. */
  max?: number
  /** Step increment. */
  step?: number
  /** Called with the new value. */
  onChange?: (value: number) => void
  /** Accessible label. */
  label?: string
  className?: string
}

/**
 * A − / + quantity control — bottles held, vintage, anything numeric.
 */
export function NumberStepper({
  value,
  min = 0,
  max = 9999,
  step = 1,
  onChange,
  label = 'Quantity',
  className,
}: NumberStepperProps) {
  const cls = ['ws-stepper', className].filter(Boolean).join(' ')
  const set = (v: number) => onChange?.(Math.max(min, Math.min(max, v)))
  return (
    <div className={cls} role="group" aria-label={label}>
      <button
        type="button"
        className="ws-stepper__btn"
        aria-label="Decrease"
        disabled={value <= min}
        onClick={() => set(value - step)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14" />
        </svg>
      </button>
      <span className="ws-stepper__value">{value}</span>
      <button
        type="button"
        className="ws-stepper__btn"
        aria-label="Increase"
        disabled={value >= max}
        onClick={() => set(value + step)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  )
}
