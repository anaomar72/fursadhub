import { RouteSuspense } from '../../../app/router/RouteFallback'
import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AccessDeniedState, LoadingSpinner } from '../../../components/ui'
import { AppShell } from '../../../app/layouts/AppShell'
import { PageContainer } from '../../../app/layouts/PageContainer'
import * as adminApi from '../api/adminApi'
import { AdminSessionContext } from './AdminSessionContext'
import { buildAdminNav } from './adminNavigation'
import { adminWorkspaceLabelKey } from '../adminCapabilities'

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
        <LoadingSpinner size="lg" label={t('common:status.loading')} />
      </div>
    )
  }

  const session = sessionQuery.data
  if (!session?.platformAdmin) {
    /*
     * Rendered OUTSIDE the admin shell, deliberately.
     *
     * <p>It used to render inside it, which meant a student who followed a link to /admin/users was
     * shown the navy platform console chrome, an empty admin rail, and the word "Admin" three times
     * — as the area label, as the page title and as their own role beside their email — while being
     * told they have no administration access. Dressing someone in a console they cannot use is
     * confusing at best and, for anyone reading their own role off that chrome, simply wrong.
     *
     * <p>Authorization is unchanged: this branch already refused, and the backend refuses every
     * admin request independently. What changes is that the refusal no longer borrows the identity
     * of the thing it is refusing.
     */
    return <AccessDeniedState description={t('admin:nav.noAccess')} backTo="/account/profile" />
  }

  return (
    <AdminSessionContext.Provider value={session}>
      <AppShell workspace="platform"
        areaLabel={t('common:nav.admin')}
        tone="navy"
        brand={{ portalLabel: t(adminWorkspaceLabelKey(session)) }}
        sections={buildAdminNav(t, session)}
      >
        <PageContainer>
          <RouteSuspense><Outlet /></RouteSuspense>
        </PageContainer>
      </AppShell>
    </AdminSessionContext.Provider>
  )
}
