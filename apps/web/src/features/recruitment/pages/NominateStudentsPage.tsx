import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { useUniversityMembership } from '../../university/components/UniversityMembershipContext'
import { universityQueries } from '../../university/universityQueries'
import { nominationDeadlinePassed, OPEN_TARGET_STATUSES } from '../../university/universityAttention'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Alert, Badge, Breadcrumbs, Button, EmptyState, ErrorState, PageHeader, Panel, SkeletonList, SkeletonPanel, StatusBadge } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'
import { OPPORTUNITY_TARGET_STATUS_TONE, toneOf } from '../../../lib/status/statusTones'

/**
 * Nominating eligible students for one targeted internship (CLAUDE.md section 35), Phase 7.
 *
 * <p>The page says what a nomination is and what follows it, because the step is easy to
 * misread: a nomination asks the STUDENT whether they want to be considered — it is not an
 * application and not an offer. Once they agree, they join the organization's one candidate
 * pipeline alongside public applicants.
 *
 * <p>The eligible-student list is the backend's ({@code NominationQueryService.listEligibleStudents}):
 * VERIFIED enrollments, inside the caller's department scope and the request's eligible
 * departments. Nothing here ranks students or picks "the best" — the list is in the order the API
 * returns it, and every nomination is re-checked on write (deadline, availability, duplicates).
 * Past the nomination deadline the backend refuses every nomination, so the page says so instead of
 * offering buttons that can only fail. The payload is unchanged.
 */
export function NominateStudentsPage() {
  const { t } = useTranslation()
  const { targetId } = useParams<{ targetId: string }>()
  const { universityId } = useUniversityMembership()
  const queryClient = useQueryClient()

  const requestsQuery = useQuery(universityQueries.targetRequests(universityId))
  const departmentsQuery = useQuery(universityQueries.departments(universityId))
  const studentsQuery = useQuery({
    queryKey: ['recruitment', 'eligible-students', universityId, targetId],
    queryFn: () => recruitmentApi.listEligibleStudents(universityId, targetId!),
    enabled: !!targetId,
  })

  const request = requestsQuery.data?.find((candidate) => candidate.targetId === targetId)

  const nominateMutation = useMutation({
    mutationFn: (studentUserId: string) => recruitmentApi.nominateStudent(universityId, { opportunityId: request!.opportunityId, studentUserId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recruitment', 'eligible-students'] })
      void queryClient.invalidateQueries({ queryKey: ['recruitment', 'target-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['recruitment', 'university-nominations'] })
    },
  })

  const crumbs = [{ label: t('recruitment:requests.title'), to: '/university/opportunity-requests' }]

  if (requestsQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonPanel rows={5} />
      </PageContainer>
    )
  }

  if (requestsQuery.isError) {
    return (
      <PageContainer>
        <ErrorState onRetry={() => void requestsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      </PageContainer>
    )
  }

  if (!request) {
    return (
      <PageContainer className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <EmptyState title={t('recruitment:requests.notFound')} />
      </PageContainer>
    )
  }

  const passed = nominationDeadlinePassed(request)
  const accepting = OPEN_TARGET_STATUSES.has(request.targetStatus) && !passed
  const names = new Map((departmentsQuery.data ?? []).map((department) => [department.id, department.name]))
  const departments = request.eligibleDepartmentIds.map((id) => names.get(id)).filter((name): name is string => !!name)
  const students = studentsQuery.data ?? []

  return (
    <PageContainer className="flex flex-col gap-6">
      <Breadcrumbs items={[...crumbs, { label: request.opportunityTitle }]} />
      <PageHeader eyebrow={request.organizationName} title={request.opportunityTitle} description={t('recruitment:nominate.subtitle')} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section className="flex min-w-0 flex-col gap-4 lg:order-1" aria-labelledby="eligible-heading">
          <div>
            <h2 id="eligible-heading" className="text-title-section text-foreground">{t('recruitment:nominate.eligibleTitle')}</h2>
            <p className="mt-1 text-body text-foreground-secondary">{t('recruitment:nominate.eligibleExplainer')}</p>
          </div>

          {!accepting && (
            <Alert tone="info" title={t('recruitment:nominate.closedTitle')}>
              {passed ? t('recruitment:nominate.closedDeadline', { date: formatDate(request.nominationDeadline) }) : t('recruitment:nominate.closedStatus')}
            </Alert>
          )}

          {nominateMutation.isError && <Alert tone="danger">{apiErrorMessage(t, 'recruitment', 'nominate', nominateMutation.error)}</Alert>}

          {studentsQuery.isLoading ? (
            <SkeletonList rows={4} />
          ) : studentsQuery.isError ? (
            <ErrorState variant="inline" onRetry={() => void studentsQuery.refetch()} retryLabel={t('common:actions.retry')} />
          ) : students.length === 0 ? (
            <EmptyState title={t('recruitment:nominate.empty')} description={t('recruitment:nominate.emptyHint')} />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {students.map((student) => {
                const name = student.fullName ?? student.email ?? student.studentNumber
                return (
                  <li key={student.studentUserId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-body font-semibold text-foreground">{name}</p>
                      <p className="break-words text-caption text-foreground-secondary">
                        {[student.studentNumber, names.get(student.departmentId), student.program, student.academicYear].filter(Boolean).join(' · ')}
                      </p>

                      {/*
                        Enough of the student's own professional profile to decide, inline. Only what
                        the student wrote — no CV and no enrollment evidence; those stay on their own
                        authorized routes.
                      */}
                      {student.professional?.headline && <p className="mt-2 text-body text-foreground">{student.professional.headline}</p>}
                      {(student.professional?.skills?.length ?? 0) > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t('recruitment:nominate.skills')}>
                          {student.professional!.skills.slice(0, 6).map((skill) => (
                            <li key={skill}>
                              <Badge tone="brand" className="px-2 py-0.5">{skill}</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                      {student.professional?.summary ? (
                        <details className="mt-2">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm text-caption font-semibold text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                            {t('recruitment:nominate.viewProfile')}
                            <span className="sr-only"> — {name}</span>
                          </summary>
                          <p className="mt-2 whitespace-pre-line text-body text-foreground-secondary">{student.professional.summary}</p>
                        </details>
                      ) : (
                        !student.professional?.headline && <p className="mt-2 text-caption text-foreground-secondary">{t('recruitment:nominate.noProfile')}</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {student.alreadyNominated ? (
                        <StatusBadge tone="success">{t('recruitment:nominate.alreadyNominated')}</StatusBadge>
                      ) : accepting ? (
                        <Button
                          size="sm"
                          aria-label={t('recruitment:nominate.nominateNamed', { name })}
                          loading={nominateMutation.isPending && nominateMutation.variables === student.studentUserId}
                          disabled={nominateMutation.isPending}
                          onClick={() => nominateMutation.mutate(student.studentUserId)}
                        >
                          {t('recruitment:nominate.nominate')}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <aside className="order-first flex min-w-0 flex-col gap-6 lg:order-2" aria-label={t('recruitment:nominate.requestTitle')}>
          <Panel title={t('recruitment:nominate.requestTitle')}>
            <dl className="flex flex-col gap-3">
              <Fact label={t('recruitment:nominate.status')}>
                <StatusBadge tone={toneOf(OPPORTUNITY_TARGET_STATUS_TONE, request.targetStatus)}>{t(`recruitment:targetStatusValues.${request.targetStatus}`)}</StatusBadge>
              </Fact>
              <Fact label={t('recruitment:nominate.nominees')}>
                {t('recruitment:requests.progress', { current: request.liveNominationCount, requested: request.requestedNominees })}
              </Fact>
              <Fact label={t('recruitment:nominate.deadline')}>{formatDate(request.nominationDeadline)}</Fact>
              <Fact label={t('recruitment:nominate.dates')}>
                {t('placements:detail.dateRange', { start: formatDate(request.startDate), end: formatDate(request.endDate) })}
              </Fact>
              <Fact label={t('recruitment:nominate.mode')}>{t(`opportunities:modeValues.${request.mode}`)}</Fact>
              <Fact label={t('recruitment:nominate.departments')}>
                {departments.length > 0 ? departments.join(', ') : t('recruitment:requests.allDepartments')}
              </Fact>
            </dl>
          </Panel>
          <Panel title={t('recruitment:nominate.whatHappensTitle')}>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-body text-foreground-secondary">
              <li>{t('recruitment:nominate.whatHappens.consent')}</li>
              <li>{t('recruitment:nominate.whatHappens.pipeline')}</li>
              <li>{t('recruitment:nominate.whatHappens.withdraw')}</li>
            </ol>
          </Panel>
        </aside>
      </div>
    </PageContainer>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption font-semibold text-foreground-secondary">{label}</dt>
      <dd className="mt-0.5 break-words text-body text-foreground">{children}</dd>
    </div>
  )
}
