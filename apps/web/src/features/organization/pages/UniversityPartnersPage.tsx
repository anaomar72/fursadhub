import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as placementsApi from '../../placements/api/placementsApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { universityPartners } from '../organizationMetrics'
import {
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

/**
 * The universities this organization actually works with.
 *
 * <p>FursadHub has no partnership record and no organization↔university relationship endpoint. A
 * university becomes a partner by placing a student with you, so that is exactly how this is
 * counted — from the organization's own placement list, which the caller is already authorized to
 * read. Nothing here is hardcoded and nothing is a directory of universities the organization has
 * no relationship with.
 *
 * <p>It is the mirror of the university area's "Partner organizations" page, which reads the same
 * relationship from the other side, and it deliberately shows the same shape of facts.
 */
export function UniversityPartnersPage() {
  const { t } = useTranslation()
  const { organizationId } = useOrganizationMembership()

  const placementsQuery = useQuery({
    queryKey: ['placements', 'organization', organizationId],
    queryFn: () => placementsApi.listOrganizationPlacements(organizationId),
  })

  const partners = universityPartners(placementsQuery.data ?? [])

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title={t('organization:partners.title')}
        description={t('organization:partners.subtitle')}
      />

      {placementsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : placementsQuery.isError ? (
        <ErrorState onRetry={() => void placementsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : partners.length === 0 ? (
        <EmptyState title={t('organization:partners.empty')} description={t('organization:partners.emptyHint')} />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('organization:partners.resultCount', { count: partners.length })}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {partners.map((partner) => (
              <li key={partner.id}>
                <Card padding="lg" className="h-full">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info">
                      <Icon name="bank" className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-foreground">
                        {/* Public university profiles are open to everyone, signed in or not. */}
                        <Link to={`/universities/${partner.id}`} className="hover:text-link hover:underline">
                          {partner.name ?? t('organization:partners.unnamed')}
                        </Link>
                      </h2>
                      <p className="mt-1 text-sm text-foreground-secondary">
                        {t('organization:partners.studentCount', { count: partner.studentCount })}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <div>
                      <dt className="text-xs text-foreground-secondary">{t('organization:partners.placements')}</dt>
                      <dd className="mt-1 text-2xl font-bold text-brand-navy dark:text-foreground">
                        {partner.placementCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-foreground-secondary">{t('organization:partners.live')}</dt>
                      <dd className="mt-1 text-2xl font-bold text-brand-navy dark:text-foreground">
                        {partner.livePlacementCount}
                      </dd>
                    </div>
                  </dl>

                  {partner.livePlacementCount > 0 && (
                    <div className="mt-4">
                      <StatusBadge tone="success">
                        {t('organization:partners.liveCount', { count: partner.livePlacementCount })}
                      </StatusBadge>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageContainer>
  )
}
