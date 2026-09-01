import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as publicOpportunityApi from '../api/publicOpportunityApi'
import { EmptyState, Input, LoadingSpinner, PageHeader, Pagination, Select, VerifiedBadge } from '../../../components/ui'
import type { WorkMode } from '../types'

const WORK_MODES: WorkMode[] = ['ONSITE', 'HYBRID', 'REMOTE']

export function PublicOpportunityListPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  // A public organization profile links here with ?organization=<id> to show only its own
  // opportunities — read once at mount, same as any other filter, not re-synced afterward.
  const organization = searchParams.get('organization') ?? undefined
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode | ''>('')
  const [page, setPage] = useState(0)

  const opportunitiesQuery = useQuery({
    queryKey: ['public-opportunities', query, location, workMode, organization, page],
    queryFn: () =>
      publicOpportunityApi.listPublicOpportunities({
        query: query || undefined,
        location: location || undefined,
        workMode: workMode || undefined,
        organization,
        page,
      }),
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader title={t('opportunities:public.title')} />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(0)
          }}
          placeholder={t('opportunities:public.searchPlaceholder')}
        />
        <Input
          value={location}
          onChange={(e) => {
            setLocation(e.target.value)
            setPage(0)
          }}
          placeholder={t('opportunities:public.locationPlaceholder')}
        />
        <Select
          value={workMode}
          onChange={(e) => {
            setWorkMode(e.target.value as WorkMode | '')
            setPage(0)
          }}
        >
          <option value="">{t('opportunities:public.allWorkModes')}</option>
          {WORK_MODES.map((value) => (
            <option key={value} value={value}>
              {t(`opportunities:workModeValues.${value}`)}
            </option>
          ))}
        </Select>
      </div>

      {opportunitiesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : opportunitiesQuery.data?.content.length === 0 ? (
        <EmptyState className="mt-6" title={t('opportunities:public.empty')} />
      ) : (
        <>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {opportunitiesQuery.data?.content.map((opportunity) => (
              <li key={opportunity.id} className="rounded-lg border border-border bg-surface p-4">
                <Link to={`/opportunities/${opportunity.id}`} className="block">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-foreground-secondary">{opportunity.organization.name}</p>
                    {opportunity.organization.verified && <VerifiedBadge />}
                  </div>
                  <p className="mt-1 text-base font-semibold text-foreground">{opportunity.title}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground-secondary">{opportunity.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground-secondary">
                    <span>{t(`opportunities:workModeValues.${opportunity.workMode}`)}</span>
                    {opportunity.location && <span>{opportunity.location}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            page={opportunitiesQuery.data?.page ?? 0}
            totalPages={opportunitiesQuery.data?.totalPages ?? 0}
            onPageChange={setPage}
            className="mt-8"
          />
        </>
      )}
    </div>
  )
}
