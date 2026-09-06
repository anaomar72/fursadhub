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
 *
 * <p>Presentation refresh: this area uses the approved NAVY rail (reference 09), branded with the
 * university's own logo, name and portal label. That identity is read from the public profile of
 * the university the caller is actually a member of — never from anything the browser supplies.
 */
export function UniversityAreaLayout() {
  const { t } = useTranslation()
  const membershipQuery = useQuery({ queryKey: ['university', 'my-membership'], queryFn: universityApi.getMyMembership, retry: false })

  const universityId = membershipQuery.data?.universityId
  const universityQuery = useQuery({
    queryKey: ['public-university', universityId],
    queryFn: () => universityApi.getPublicUniversity(universityId!),
    enabled: !!universityId,
    retry: false,
    staleTime: 5 * 60_000,
  })

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
        tone="navy"
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

  const university = universityQuery.data

  return (
    <UniversityMembershipContext.Provider value={membershipQuery.data}>
      <AppShell
        areaLabel={t('common:nav.university')}
        tone="navy"
        sections={buildUniversityNav(t, membershipQuery.data)}
        brand={{
          name: university?.name,
          // Only when the backend says a logo exists — an unconditional URL would render a broken
          // image for every university that has not uploaded one.
          logoUrl: university?.hasLogo ? universityApi.universityLogoUrl(university.id) : undefined,
          portalLabel: t('common:shell.portals.university'),
        }}
      />
    </UniversityMembershipContext.Provider>
  )
}
