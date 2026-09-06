import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '../../../components/ui'
import { AppShell } from '../../../app/layouts/AppShell'
import { PageContainer } from '../../../app/layouts/PageContainer'
import * as adminApi from '../api/adminApi'
import { AdminSessionContext } from './AdminSessionContext'
import { buildAdminNav } from './adminNavigation'

/**
 * Resolves the caller's platform roles once, shares them with every admin page, and builds the
 * sidebar from them.
 *
 * <p>This drives NAVIGATION only — which destinations are worth showing. It is not a security
 * boundary and must never be mistaken for one: every admin endpoint re-checks the caller's grant
 * against current PostgreSQL data, so hiding a destination from a verification officer is a
 * courtesy, and reaching its route by typing the URL still yields a 403 from the API
 * (CLAUDE.md section 24).
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
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const session = sessionQuery.data
  if (!session?.platformAdmin) {
    return (
      <AppShell
        areaLabel={t('common:nav.admin')}
        tone="navy"
        sections={[
          {
            label: t('common:shell.sections.account'),
            items: [{ to: '/account/notifications', label: t('notifications:title'), icon: 'bell' }],
          },
        ]}
      >
        <p className="px-4 py-10 text-center text-sm text-foreground-secondary">{t('admin:nav.noAccess')}</p>
      </AppShell>
    )
  }

  return (
    <AdminSessionContext.Provider value={session}>
      <AppShell
        areaLabel={t('common:nav.admin')}
        tone="navy"
        brand={{ portalLabel: t('common:shell.portals.admin') }}
        sections={buildAdminNav(t, session)}
      >
        <PageContainer>
          <Outlet />
        </PageContainer>
      </AppShell>
    </AdminSessionContext.Provider>
  )
}
