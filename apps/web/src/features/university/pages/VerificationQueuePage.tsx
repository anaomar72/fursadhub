import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { EmptyState, ErrorState, LoadingState, PageHeader, Select, StatusBadge } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

const STATUS_TONE: Record<string, StatusTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  NEEDS_MORE_EVIDENCE: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  REVOKED: 'danger',
}

export function VerificationQueuePage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()
  const [status, setStatus] = useState<string>('')

  const queueQuery = useQuery({
    queryKey: ['university', 'verification-cases', universityId, status],
    queryFn: () => universityApi.listVerificationQueue(universityId, status || undefined),
  })

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t('university:verificationQueue.title')} />
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('university:verificationQueue.allStatuses')}</option>
          <option value="SUBMITTED">{t('university:students.statusValues.SUBMITTED')}</option>
          <option value="UNDER_REVIEW">{t('university:students.statusValues.UNDER_REVIEW')}</option>
          <option value="NEEDS_MORE_EVIDENCE">{t('university:students.statusValues.NEEDS_MORE_EVIDENCE')}</option>
          <option value="VERIFIED">{t('university:students.statusValues.VERIFIED')}</option>
          <option value="REJECTED">{t('university:students.statusValues.REJECTED')}</option>
        </Select>
      </div>

      {queueQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : queueQuery.isError ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void queueQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : queueQuery.data?.length === 0 ? (
        <EmptyState className="mt-6" title={t('university:verificationQueue.empty')} />
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
          {queueQuery.data?.map((row) => (
            <li key={row.id}>
              <Link
                to={`/university/verification-cases/${row.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{row.studentEmail}</p>
                  <p className="text-xs text-foreground-secondary">
                    {row.studentNumber} · {row.program}
                  </p>
                </div>
                <StatusBadge tone={STATUS_TONE[row.status] ?? 'neutral'}>
                  {t(`university:students.statusValues.${row.status}`)}
                </StatusBadge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
