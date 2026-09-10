import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as placementsApi from '../../placements/api/placementsApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { partnerOrganizations } from '../universityMetrics'
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, StatusBadge } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

/**
 * The organizations hosting this university's students.
 *
 * <p>FursadHub has no partnership entity and no organization-directory endpoint for universities,
 * so "partner" is defined by the only real relationship that exists: an organization that hosts one
 * of your placements. Everything shown is counted from `GET /universities/{id}/placements`, which
 * the backend has already scoped to the caller — nothing is fetched about organizations the
 * university has no placement with, and nothing is invented.
 */
export function PartnerOrganizationsPage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()

  const placementsQuery = useQuery({
    queryKey: ['university', 'placements', universityId],
    queryFn: () => placementsApi.listUniversityPlacements(universityId),
  })

  const partners = partnerOrganizations(placementsQuery.data ?? [])

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('university:partners.title')} description={t('university:partners.subtitle')} />

      {placementsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : placementsQuery.isError ? (
        <ErrorState onRetry={() => void placementsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : partners.length === 0 ? (
        <EmptyState title={t('university:partners.empty')} description={t('university:partners.emptyHint')} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {partners.map((partner) => (
            <li key={partner.id} className="flex">
              <Card interactive padding="lg" className="relative flex w-full flex-col">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
                    <Icon name="building" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-foreground">
                      <Link
                        to={`/organizations/${partner.id}`}
                        className="focus-visible:outline-none focus-visible:underline after:absolute after:inset-0"
                      >
                        {partner.name ?? t('university:partners.unnamed')}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-xs text-muted">
                      {t('university:partners.placementCount', { count: partner.placementCount })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {partner.livePlacementCount > 0 ? (
                    <StatusBadge tone="success">
                      {t('university:partners.liveCount', { count: partner.livePlacementCount })}
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">{t('university:partners.noLive')}</StatusBadge>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
