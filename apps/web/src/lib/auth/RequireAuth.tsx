import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { LoadingSpinner } from '../../components/ui'
import { TermsAcceptanceGate } from '../../features/legal/components/TermsAcceptanceGate'

/**
 * Authenticated-route foundation (CLAUDE.md section 61 Phase 1 scope). This is UX only, not a
 * security boundary — the backend independently enforces authentication/authorization on every
 * protected endpoint regardless of what the frontend router allows (CLAUDE.md section 24).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { isAuthenticated, isInitializing, signedOut } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner size="lg" label={t('common:status.loading')} />
      </div>
    )
  }

  if (!isAuthenticated) {
    // After an explicit sign-out the protected page belonged to the account that left. Remembering
    // it would send the next person to sign in on this tab to the previous account's deep link —
    // so `from` is kept only for a visitor who has not just signed out (a deep link, an expiry).
    return <Navigate to="/login" replace state={signedOut ? undefined : { from: location }} />
  }

  // Phase 7. Prompts for any legal-document version the user has not yet accepted
  // (CLAUDE.md section 49). It sits here rather than on the registration form so it covers accounts
  // that already existed and every version published later, not only new sign-ups. It fails open:
  // if the status call errors, the app renders normally rather than locking everyone out.
  return <TermsAcceptanceGate>{children}</TermsAcceptanceGate>
}
