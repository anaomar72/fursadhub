import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as publicOpportunityApi from '../api/publicOpportunityApi'
import { Input, LoadingSpinner, Pagination, Select } from '../../../components/ui'
import type { WorkMode } from '../types'

const WORK_MODES: WorkMode[] = ['ONSITE', 'HYBRID', 'REMOTE']

export function PublicOpportunityListPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode | ''>('')
  const [page, setPage] = useState(0)

  const opportunitiesQuery = useQuery({
    queryKey: ['public-opportunities', query, location, workMode, page],
    queryFn: () =>
      publicOpportunityApi.listPublicOpportunities({
        query: query || undefined,
        location: location || undefined,
        workMode: workMode || undefined,
        page,
      }),
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">{t('opportunities:public.title')}</h1>

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
      ) : (
        <>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {opportunitiesQuery.data?.content.map((opportunity) => (
              <li key={opportunity.id} className="rounded-lg border border-border bg-surface p-4">
                <Link to={`/opportunities/${opportunity.id}`} className="block">
                  <p className="text-xs font-medium text-foreground-secondary">{opportunity.organization.name}</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{opportunity.title}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground-secondary">{opportunity.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground-secondary">
                    <span>{t(`opportunities:workModeValues.${opportunity.workMode}`)}</span>
                    {opportunity.location && <span>{opportunity.location}</span>}
                  </div>
                </Link>
              </li>
            ))}
            {opportunitiesQuery.data?.content.length === 0 && (
              <li className="col-span-full py-10 text-center text-sm text-foreground-secondary">{t('opportunities:public.empty')}</li>
            )}
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
