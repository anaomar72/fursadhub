import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { UniversityMembershipContext } from './UniversityMembershipContext'
import { LoadingSpinner } from '../../../components/ui'
import { cn } from '../../../lib/utils/cn'

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-primary text-on-brand' : 'text-foreground-secondary hover:bg-surface-muted',
  )

/**
 * Resolves the caller's active university staff membership once and shares it with every
 * university sub-page via context — those pages still rely on the backend re-checking
 * authorization on every request (CLAUDE.md section 24); this only drives navigation/UX.
 */
export function UniversityAreaLayout() {
  const { t } = useTranslation()
  const membershipQuery = useQuery({ queryKey: ['university', 'my-membership'], queryFn: universityApi.getMyMembership, retry: false })

  if (membershipQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!membershipQuery.data) {
    return <p className="px-4 py-10 text-center text-sm text-foreground-secondary">{t('university:nav.noMembership')}</p>
  }

  const isAdmin = membershipQuery.data.role === 'UNIVERSITY_ADMIN'

  return (
    <UniversityMembershipContext.Provider value={membershipQuery.data}>
      <div className="border-b border-border bg-surface">
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          <NavLink to="/university/students" className={navLinkClasses}>
            {t('university:nav.students')}
          </NavLink>
          <NavLink to="/university/verification-cases" className={navLinkClasses}>
            {t('university:nav.verificationQueue')}
          </NavLink>
          <NavLink to="/university/opportunity-requests" className={navLinkClasses}>
            {t('recruitment:nav.opportunityRequests')}
          </NavLink>
          <NavLink to="/university/nominations" className={navLinkClasses}>
            {t('recruitment:nav.nominations')}
          </NavLink>
          <NavLink to="/university/placements" className={navLinkClasses}>
            {t('placements:nav.placements')}
          </NavLink>
          <NavLink to="/university/departments" className={navLinkClasses}>
            {t('university:nav.departments')}
          </NavLink>
          {isAdmin && (
            <NavLink to="/university/staff" className={navLinkClasses}>
              {t('university:nav.staff')}
            </NavLink>
          )}
        </nav>
      </div>
      <Outlet />
    </UniversityMembershipContext.Provider>
  )
}
