import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { UniversityMembershipContext } from './UniversityMembershipContext'
import { UniversitySetupPage } from '../pages/UniversitySetupPage'
import { buildUniversityNav } from './universityNavigation'
import { LoadingSpinner } from '../../../components/ui'
import { AppShell } from '../../../app/layouts/AppShell'

/**
 * Resolves the caller's active university staff membership once, shares it with every university
 * sub-page via context, and builds the sidebar from that same membership — those pages still rely
 * on the backend re-checking authorization on every request (CLAUDE.md section 24); this only
 * drives navigation/UX.
 */
export function UniversityAreaLayout() {
  const { t } = useTranslation()
  const membershipQuery = useQuery({ queryKey: ['university', 'my-membership'], queryFn: universityApi.getMyMembership, retry: false })

  if (membershipQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // No membership yet: the setup screen still gets the shell (with only the account destinations),
  // so a visitor here can always reach notifications, theme, language and sign-out.
  if (!membershipQuery.data) {
    return (
      <AppShell
        areaLabel={t('common:nav.university')}
        sections={[
          {
            label: t('common:shell.sections.account'),
            items: [{ to: '/account/notifications', label: t('notifications:title'), icon: 'bell' }],
          },
        ]}
      >
        <UniversitySetupPage />
      </AppShell>
    )
  }

  return (
    <UniversityMembershipContext.Provider value={membershipQuery.data}>
      <AppShell areaLabel={t('common:nav.university')} sections={buildUniversityNav(t, membershipQuery.data)} />
    </UniversityMembershipContext.Provider>
  )
}
