import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { LoadingSpinner } from '../../../components/ui'

export function DepartmentsPage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()
  const departmentsQuery = useQuery({
    queryKey: ['departments', universityId],
    queryFn: () => universityApi.listDepartments(universityId),
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{t('university:departments.title')}</h1>

      {departmentsQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
          {departmentsQuery.data?.map((department) => (
            <li key={department.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-foreground">{department.name}</span>
              <span className="text-xs text-foreground-secondary">{department.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
