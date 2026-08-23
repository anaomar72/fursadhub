import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import { OrganizationMembershipContext } from './OrganizationMembershipContext'
import { OrganizationSetupPage } from '../pages/OrganizationSetupPage'
import { LoadingSpinner } from '../../../components/ui'
import { cn } from '../../../lib/utils/cn'

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-primary text-on-brand' : 'text-foreground-secondary hover:bg-surface-muted',
  )

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
      <div className="border-b border-border bg-surface">
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          <NavLink to="/organization/opportunities" className={navLinkClasses}>
            {t('organization:nav.opportunities')}
          </NavLink>
          <NavLink to="/organization/profile" className={navLinkClasses}>
            {t('organization:nav.profile')}
          </NavLink>
          {isAdmin && (
            <NavLink to="/organization/staff" className={navLinkClasses}>
              {t('organization:nav.staff')}
            </NavLink>
          )}
        </nav>
      </div>
      <Outlet />
    </OrganizationMembershipContext.Provider>
  )
}
