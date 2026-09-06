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
 *
 * <p>Presentation refresh: this area uses the approved LIGHT rail (reference 08), branded with the
 * organization's own logo and name. That identity is read from the organization's public profile
 * for the tenant the caller is actually a member of — never from anything the browser supplies.
 */
export function OrganizationAreaLayout() {
  const { t } = useTranslation()
  const membershipsQuery = useQuery({
    queryKey: ['organization', 'my-memberships'],
    queryFn: organizationApi.getMyMemberships,
    retry: false,
  })

  const membership = membershipsQuery.data?.[0]
  const organizationId = membership?.organizationId

  const organizationQuery = useQuery({
    queryKey: ['public-organization', organizationId],
    queryFn: () => organizationApi.getPublicOrganization(organizationId!),
    enabled: !!organizationId,
    retry: false,
    staleTime: 5 * 60_000,
  })

  if (membershipsQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

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

  const organization = organizationQuery.data

  return (
    <OrganizationMembershipContext.Provider value={membership}>
      <AppShell
        areaLabel={t('common:nav.organization')}
        sections={buildOrganizationNav(t, membership)}
        brand={{
          name: organization?.name,
          // Only when the backend says a logo exists — an unconditional URL would render a broken
          // image for every organization that has not uploaded one.
          logoUrl: organization?.hasLogo ? organizationApi.organizationLogoUrl(organization.id) : undefined,
          portalLabel: t('common:shell.portals.organization'),
        }}
      />
    </OrganizationMembershipContext.Provider>
  )
}
