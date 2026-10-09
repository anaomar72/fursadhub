import type { ReactNode } from 'react'
import { AnimatedCheck, Icon, LoadingSpinner } from '../../../components/ui'
import { cn } from '../../../lib/utils/cn'
import { AuthCard } from './AuthCard'

/**
 * What an auth lifecycle screen is saying.
 *
 * - `loading` — a request is in flight and the user can only wait.
 * - `success` — the thing they came to do is done.
 * - `info` — nothing went wrong; there is simply a next step (a code is on its way).
 * - `warning` — recoverable: the attempt failed but the same page offers the way forward.
 * - `error` — this route cannot proceed; the way forward is elsewhere.
 */
export type AuthStatusTone = 'loading' | 'success' | 'info' | 'warning' | 'error'

export interface AuthStatusProps {
  tone: AuthStatusTone
  title: string
  description?: ReactNode
  /** Buttons and links, in the order they should be tried. Rendered as one stacked column. */
  actions?: ReactNode
  /** Extra content between the description and the actions — a cooldown line, a resend control. */
  children?: ReactNode
}

const MARK_CLASSES: Record<Exclude<AuthStatusTone, 'success'>, string> = {
  loading: 'bg-surface-muted text-foreground-secondary',
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  error: 'bg-danger-bg text-danger',
}

const MARK_ICON = {
  info: 'info',
  warning: 'alert',
  error: 'alert',
} as const

/**
 * The one result screen for every auth lifecycle state.
 *
 * <p>Registration, email verification, resend, forgot-password and reset-password each used to end
 * on a screen written from scratch: two of them drew a success check, one printed a centred
 * paragraph with no status treatment at all, and one showed nothing but a heading that happened to
 * be an error message. Five outcomes, five different shapes, no shared vocabulary — so "your email
 * is verified" and "this link is no longer valid" looked equally like ordinary body copy.
 *
 * <p>This is that vocabulary. Tone picks the mark, the mark carries the meaning, and every screen
 * ends the same way: mark, title, explanation, then the next actions in the order they should be
 * tried.
 *
 * <p><strong>The icon is never the only carrier of meaning.</strong> Each tone's mark is decorative
 * (`aria-hidden`) and the state is stated in the title text; colour and glyph reinforce it for
 * people who can see them. `loading` and `error` additionally announce themselves — see below.
 *
 * <p>Motion is the existing one-time confirmation sequence for success, and nothing at all for the
 * other tones: an error that animates in reads as a system that is pleased with itself. Reduced
 * motion is handled inside {@link AnimatedCheck} and by the shared duration tokens.
 */
export function AuthStatus({ tone, title, description, actions, children }: AuthStatusProps) {
  return (
    <AuthCard title={title}>
      <div className="flex flex-col items-center text-center">
        {tone === 'success' ? (
          // The approved VERIFIED sequence (CLAUDE.md section 58). Its own label
          // is already announced, so the title above is not repeated into it.
          <AnimatedCheck label={title} />
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              'flex size-14 items-center justify-center rounded-full',
              MARK_CLASSES[tone],
            )}
          >
            {tone === 'loading' ? <LoadingSpinner /> : <Icon name={MARK_ICON[tone]} className="size-7" />}
          </span>
        )}

        {description && (
          <p
            className="mt-5 max-w-sm text-body text-foreground-secondary"
            // A pending request and a failure are both things the user is waiting on an answer
            // about, so they are announced; a success already speaks through AnimatedCheck's own
            // live label, and announcing it twice is the duplicate-noise problem, not politeness.
            role={tone === 'error' || tone === 'warning' ? 'alert' : undefined}
            aria-live={tone === 'loading' ? 'polite' : undefined}
          >
            {description}
          </p>
        )}

        {children && <div className="mt-5 w-full">{children}</div>}

        {actions && <div className="mt-7 flex w-full flex-col items-stretch gap-3">{actions}</div>}
      </div>
    </AuthCard>
  )
}
