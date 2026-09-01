import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import { OrganizationMembershipContext } from './OrganizationMembershipContext'
import { OrganizationSetupPage } from '../pages/OrganizationSetupPage'
import { LoadingSpinner } from '../../../components/ui'
import { AreaTabs } from '../../../app/layouts/AreaTabs'

/**
 * Resolves the caller's organization staff membership and shares it via context, mirroring
 * UniversityAreaLayout. A caller may in principle hold memberships at more than one organization;
 * Phase 3 keeps this simple and uses the first one (no organization switcher yet — see the Phase 3
 * report's known limitations). Sub-pages still rely on the backend re-checking authorization on
 * every request (CLAUDE.md section 24) — this only drives navigation/UX.
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
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const membership = membershipsQuery.data?.[0]
  if (!membership) {
    return <OrganizationSetupPage />
  }

  const isAdmin = membership.role === 'ORGANIZATION_ADMIN'

  return (
    <OrganizationMembershipContext.Provider value={membership}>
      <AreaTabs
        items={[
          { to: '/organization/dashboard', label: t('organization:nav.dashboard') },
          { to: '/organization/opportunities', label: t('organization:nav.opportunities') },
          { to: '/organization/placements', label: t('placements:nav.placements') },
          { to: '/organization/profile', label: t('organization:nav.profile') },
          { to: '/organization/staff', label: t('organization:nav.staff'), hidden: !isAdmin },
        ]}
      />
      <Outlet />
    </OrganizationMembershipContext.Provider>
  )
}
