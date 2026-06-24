import React from 'react'
import { Logo } from './Logo'
import { TextField } from './TextField'
import { Button } from './Button'

export interface SignInProps {
  /** Sign in to an existing cellar, or create one. */
  mode?: 'signin' | 'signup'
  /** Called when the primary action is pressed. */
  onSubmit?: () => void
  /** Footer slot (e.g. a switch-mode link). */
  footer?: React.ReactNode
  className?: string
}

/**
 * The account entry screen — brand, a title, email + password, and the primary
 * action. Personal now; ready for sign-ups when it becomes a product.
 */
export function SignIn({ mode = 'signin', onSubmit, footer, className }: SignInProps) {
  const cls = ['ws-signin', className].filter(Boolean).join(' ')
  const signup = mode === 'signup'
  return (
    <div className={cls}>
      <div className="ws-signin__head">
        <Logo variant="stacked" />
        <h1 className="ws-signin__title">{signup ? 'Create your cellar' : 'Welcome back'}</h1>
        <p className="ws-signin__sub">
          {signup ? 'A private cellar, kept impeccably.' : 'Sign in to your cellar.'}
        </p>
      </div>
      <div className="ws-signin__form">
        <TextField label="Email" type="email" placeholder="you@example.com" />
        <TextField label="Password" type="password" placeholder="••••••••" />
        <Button variant="primary" onClick={onSubmit}>
          {signup ? 'Create cellar' : 'Sign in'}
        </Button>
      </div>
      {footer && <div className="ws-signin__foot">{footer}</div>}
    </div>
  )
}
