import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '../../../components/ui'
import { AreaTabs } from '../../../app/layouts/AreaTabs'
import * as adminApi from '../api/adminApi'
import { AdminSessionContext } from './AdminSessionContext'

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
      <AreaTabs
        items={[
          { to: '/admin/dashboard', label: t('admin:nav.dashboard'), hidden: !isSuperAdmin },
          // Institution review is what a VERIFICATION_OFFICER exists for.
          { to: '/admin/organizations', label: t('admin:nav.organizations') },
          { to: '/admin/universities', label: t('admin:nav.universities') },
          { to: '/admin/verification-escalations', label: t('admin:nav.escalations') },
          { to: '/admin/users', label: t('admin:nav.users'), hidden: !isSuperAdmin },
          { to: '/admin/privacy-requests', label: t('admin:nav.privacyRequests'), hidden: !isSuperAdmin },
          { to: '/admin/legal-documents', label: t('admin:nav.legalDocuments'), hidden: !isSuperAdmin },
          { to: '/admin/audit', label: t('admin:nav.audit'), hidden: !isSuperAdmin },
          { to: '/admin/platform-roles', label: t('admin:nav.platformRoles'), hidden: !isSuperAdmin },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </div>
    </AdminSessionContext.Provider>
  )
}
