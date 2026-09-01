import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { UniversityMembershipContext } from './UniversityMembershipContext'
import { UniversitySetupPage } from '../pages/UniversitySetupPage'
import { LoadingSpinner } from '../../../components/ui'
import { AreaTabs } from '../../../app/layouts/AreaTabs'

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
    return <UniversitySetupPage />
  }

  const isAdmin = membershipQuery.data.role === 'UNIVERSITY_ADMIN'

  return (
    <UniversityMembershipContext.Provider value={membershipQuery.data}>
      <AreaTabs
        items={[
          { to: '/university/dashboard', label: t('university:nav.dashboard') },
          { to: '/university/students', label: t('university:nav.students') },
          { to: '/university/verification-cases', label: t('university:nav.verificationQueue') },
          { to: '/university/opportunity-requests', label: t('recruitment:nav.opportunityRequests') },
          { to: '/university/nominations', label: t('recruitment:nav.nominations') },
          { to: '/university/placements', label: t('placements:nav.placements') },
          { to: '/university/departments', label: t('university:nav.departments') },
          { to: '/university/profile', label: t('university:nav.profile') },
          // Phase 6 internship requirements. Visible to admins and coordinators alike: a coordinator
          // configures their own departments, and the backend refuses anything wider. A supervisor
          // has no policy authority at all (InternshipManagementAuthorization.requirePolicyAuthority
          // only allows UNIVERSITY_ADMIN/DEPARTMENT_COORDINATOR), so the tab must not offer it.
          { to: '/university/internship-policy', label: t('internship:policy.title'), hidden: membershipQuery.data.role === 'UNIVERSITY_SUPERVISOR' },
          { to: '/university/staff', label: t('university:nav.staff'), hidden: !isAdmin },
        ]}
      />
      <Outlet />
    </UniversityMembershipContext.Provider>
  )
}
