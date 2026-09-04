import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import { OrganizationMembershipContext } from './OrganizationMembershipContext'
import { OrganizationSetupPage } from '../pages/OrganizationSetupPage'
import { buildOrganizationNav } from './organizationNavigation'
import { LoadingSpinner } from '../../../components/ui'
import { AppShell } from '../../../app/layouts/AppShell'

/**
 * Resolves the caller's organization staff membership, shares it via context and builds the sidebar
 * from it, mirroring UniversityAreaLayout. A caller may in principle hold memberships at more than
 * one organization; this still uses the first one (no organization switcher yet — see the Phase 3
 * report's known limitations). Sub-pages rely on the backend re-checking authorization on every
 * request (CLAUDE.md section 24) — this only drives navigation/UX.
 */
export function OrganizationAreaLayout() {
  const { t } = useTranslation()
  const membershipsQuery = useQuery({
    queryKey: ['organization', 'my-memberships'],
    queryFn: organizationApi.getMyMemberships,
    retry: false,
  })

  if (membershipsQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const membership = membershipsQuery.data?.[0]
  if (!membership) {
    return (
      <AppShell
        areaLabel={t('common:nav.organization')}
        sections={[
          {
            label: t('common:shell.sections.account'),
            items: [{ to: '/account/notifications', label: t('notifications:title'), icon: 'bell' }],
          },
        ]}
      >
        <OrganizationSetupPage />
      </AppShell>
    )
  }

  return (
    <OrganizationMembershipContext.Provider value={membership}>
      <AppShell areaLabel={t('common:nav.organization')} sections={buildOrganizationNav(t, membership)} />
    </OrganizationMembershipContext.Provider>
  )
}
