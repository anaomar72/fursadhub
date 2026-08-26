import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '../../../components/ui'
import { cn } from '../../../lib/utils/cn'
import * as adminApi from '../api/adminApi'
import { AdminSessionContext } from './AdminSessionContext'

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-primary text-on-brand' : 'text-foreground-secondary hover:bg-surface-muted',
  )

/**
 * Resolves the caller's platform roles once and shares them with every admin page.
 *
 * <p>This drives NAVIGATION only — which tabs are worth showing. It is not a security boundary and
 * must never be mistaken for one: every admin endpoint re-checks the caller's grant against current
 * PostgreSQL data, so hiding a tab from a verification officer is a courtesy, and reaching its route
 * by typing the URL still yields a 403 from the API (CLAUDE.md section 24).
 */
export function AdminAreaLayout() {
  const { t } = useTranslation()
  const sessionQuery = useQuery({
    queryKey: ['admin', 'session'],
    queryFn: adminApi.getAdminSession,
    retry: false,
  })

  if (sessionQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const session = sessionQuery.data
  if (!session?.platformAdmin) {
    return (
      <p className="px-4 py-10 text-center text-sm text-foreground-secondary">{t('admin:nav.noAccess')}</p>
    )
  }

  const isSuperAdmin = session.roles.includes('SUPER_ADMIN')

  return (
    <AdminSessionContext.Provider value={session}>
      <div className="border-b border-border bg-surface">
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {isSuperAdmin && (
            <NavLink to="/admin/dashboard" className={navLinkClasses}>
              {t('admin:nav.dashboard')}
            </NavLink>
          )}
          {/* Institution review is what a VERIFICATION_OFFICER exists for. */}
          <NavLink to="/admin/organizations" className={navLinkClasses}>
            {t('admin:nav.organizations')}
          </NavLink>
          <NavLink to="/admin/verification-escalations" className={navLinkClasses}>
            {t('admin:nav.escalations')}
          </NavLink>
          {isSuperAdmin && (
            <>
              <NavLink to="/admin/users" className={navLinkClasses}>
                {t('admin:nav.users')}
              </NavLink>
              <NavLink to="/admin/privacy-requests" className={navLinkClasses}>
                {t('admin:nav.privacyRequests')}
              </NavLink>
              <NavLink to="/admin/legal-documents" className={navLinkClasses}>
                {t('admin:nav.legalDocuments')}
              </NavLink>
              <NavLink to="/admin/audit" className={navLinkClasses}>
                {t('admin:nav.audit')}
              </NavLink>
              <NavLink to="/admin/platform-roles" className={navLinkClasses}>
                {t('admin:nav.platformRoles')}
              </NavLink>
            </>
          )}
        </nav>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </div>
    </AdminSessionContext.Provider>
  )
}
