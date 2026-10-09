import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { ACCOUNT_TYPE_OPTIONS, ACCOUNT_TYPE_SETUP_PATH } from '../accountTypes'
import { consolePathFor, resolveAccountWorkspace } from '../roleRedirect'
import { Icon, LoadingSpinner } from '../../../components/ui'
import { useAuth } from '../../../lib/auth/AuthContext'

/**
 * "Choose how you want to use FursadHub" — the neutral first step for a signed-in account that has
 * no workspace yet: no organization or university membership, no platform role, and no student
 * enrollment or profile.
 *
 * <p>Registration stores only an email and a password; the account type picked on the register
 * screen is not persisted. So an account that signs in through the plain login link before setting
 * anything up has no recorded intent, and it is asked rather than guessed — it used to be dropped
 * into the student area, which misled organization and university founders. Nothing chosen here is
 * stored either: each option opens that area's existing setup step (enrollment claim, organization
 * setup, university setup), and creating that record is what establishes the workspace.
 *
 * <p>An account that already has a workspace never stays here: it is sent to its console, so
 * established users are not walked through onboarding again by a bookmark or a back button.
 */
export function GetStartedPage() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const workspaceQuery = useQuery({ queryKey: ['account-workspace'], queryFn: resolveAccountWorkspace, retry: false })

  if (workspaceQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" label={t('common:status.loading')} />
      </div>
    )
  }

  if (workspaceQuery.data && workspaceQuery.data.kind !== 'none') {
    return <Navigate to={consolePathFor(workspaceQuery.data)} replace />
  }

  return (
    <AuthCard title={t('auth:getStarted.title')} subtitle={t('auth:getStarted.subtitle')}>
      <ul className="grid gap-2">
        {ACCOUNT_TYPE_OPTIONS.map(({ type, icon }) => (
          <li key={type}>
            <Link
              to={ACCOUNT_TYPE_SETUP_PATH[type]}
              className="flex items-start gap-3 rounded-lg border border-border-strong bg-surface p-3.5 transition-colors duration-150 hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              <Icon name={icon} className="mt-0.5 size-5 shrink-0 text-foreground-secondary" />
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-foreground">{t(`auth:register.roleSelector.${type}`)}</span>
                <span className="mt-1 block text-caption text-foreground-secondary">{t(`auth:getStarted.hints.${type}`)}</span>
              </span>
              <Icon name="chevronRight" className="mt-0.5 size-4 shrink-0 text-foreground-secondary rtl:rotate-180" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-2.5 flex items-start gap-1.5 text-caption text-foreground-secondary">
        <Icon name="info" className="mt-px size-3.5 shrink-0" />
        {t('auth:register.staffNote')}
      </p>

      <p className="mt-8 border-t border-border pt-6 text-center text-body text-foreground-secondary">
        {t('auth:getStarted.wrongAccount')}{' '}
        <button
          type="button"
          onClick={() => void signOut().then(() => navigate('/login'))}
          className="rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {t('common:nav.signOut')}
        </button>
      </p>
    </AuthCard>
  )
}
