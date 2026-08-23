import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as opportunityApi from '../api/opportunityApi'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { LoadingSpinner, StatusBadge } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import type { OpportunityStatus } from '../types'

const STATUS_TONE: Record<OpportunityStatus, StatusTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  PAUSED: 'warning',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
}

export function OpportunityListPage() {
  const { t } = useTranslation()
  const { organizationId, role } = useOrganizationMembership()
  const canManage = role === 'ORGANIZATION_ADMIN' || role === 'RECRUITER'

  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', 'organization', organizationId],
    queryFn: () => opportunityApi.listOrganizationOpportunities(organizationId),
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">{t('opportunities:list.title')}</h1>
        {canManage && (
          <Link
            to="/organization/opportunities/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand-primary px-4 text-sm font-medium text-on-brand transition-colors duration-150 ease-in-out hover:bg-brand-accent"
          >
            {t('opportunities:list.create')}
          </Link>
        )}
      </div>

      {opportunitiesQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
          {opportunitiesQuery.data?.map((opportunity) => (
            <li key={opportunity.id}>
              <Link
                to={`/organization/opportunities/${opportunity.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{opportunity.title}</p>
                  <p className="text-xs text-foreground-secondary">{t(`opportunities:modeValues.${opportunity.mode}`)}</p>
                </div>
                <StatusBadge tone={STATUS_TONE[opportunity.status]}>
                  {t(`opportunities:statusValues.${opportunity.status}`)}
                </StatusBadge>
              </Link>
            </li>
          ))}
          {opportunitiesQuery.data?.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-foreground-secondary">{t('opportunities:list.empty')}</li>
          )}
        </ul>
      )}
    </div>
  )
}
