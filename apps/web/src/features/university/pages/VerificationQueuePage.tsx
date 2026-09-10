import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { EmptyState, ErrorState, Icon, LoadingState, PageHeader, Select, StatusBadge } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

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

  /*
   * Department NAMES for the rows. The case DTO carries `departmentId` only, and a reviewer deciding
   * which case to open needs the department, not a UUID — it is the scope boundary their whole role
   * is defined by. Both roles that can reach this page (UNIVERSITY_ADMIN, DEPARTMENT_COORDINATOR)
   * can already list departments, and this is the same list the departments page reads, so it is a
   * cache hit rather than an extra round trip on most navigations. If it fails or is still loading
   * the row simply omits the department rather than showing a raw id.
   */
  const departmentsQuery = useQuery({
    queryKey: ['university', 'departments', universityId],
    queryFn: () => universityApi.listDepartments(universityId),
    retry: false,
  })
  const departmentNames = new Map((departmentsQuery.data ?? []).map((d) => [d.id, d.name]))

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title={t('university:verificationQueue.title')}
          description={t('university:verificationQueue.subtitle')}
        />
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
              {/*
                One row carries what a reviewer needs to triage without opening the case: who, which
                department (their scope boundary), when it arrived, whether evidence is attached, and
                the status. Every value comes from the case DTO; nothing here is derived or invented,
                and a missing field is dropped rather than filled with a placeholder.
              */}
              <Link
                to={`/university/verification-cases/${row.id}`}
                className="group flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {row.studentFullName || row.studentEmail}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-foreground-secondary">
                    {[row.studentNumber, row.program, row.departmentId && departmentNames.get(row.departmentId)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {row.submittedAt && (
                      <span>{t('university:verificationQueue.submittedOn', { date: formatDate(row.submittedAt) })}</span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Icon
                        name={row.hasEvidence ? 'document' : 'alert'}
                        className={row.hasEvidence ? 'size-3.5 text-brand-blue' : 'size-3.5 text-warning'}
                      />
                      {row.hasEvidence
                        ? t('university:verificationQueue.evidenceAttached')
                        : t('university:verificationQueue.noEvidence')}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge tone={STATUS_TONE[row.status] ?? 'neutral'}>
                    {t(`university:students.statusValues.${row.status}`)}
                  </StatusBadge>
                  <span className="hidden items-center gap-1 text-xs font-semibold text-link sm:inline-flex">
                    {t('university:verificationQueue.review')}
                    <Icon name="chevronRight" className="size-4" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
