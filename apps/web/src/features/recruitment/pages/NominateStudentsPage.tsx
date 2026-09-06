import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { useUniversityMembership } from '../../university/components/UniversityMembershipContext'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, EmptyState, LoadingSpinner, PageHeader, StatusBadge } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

/**
 * Nominating eligible students for one targeted opportunity (CLAUDE.md Phase 4 section 26).
 *
 * <p>The eligible-student list already arrives scoped to the caller's own departments — the backend
 * filters it, and re-checks scope again on every nomination. This page never filters for security,
 * only for display.
 */
export function NominateStudentsPage() {
  const { t } = useTranslation()
  const { targetId } = useParams<{ targetId: string }>()
  const membership = useUniversityMembership()
  const queryClient = useQueryClient()

  const requestsQuery = useQuery({
    queryKey: ['recruitment', 'target-requests', membership.universityId],
    queryFn: () => recruitmentApi.listTargetRequests(membership.universityId),
  })

  const studentsQuery = useQuery({
    queryKey: ['recruitment', 'eligible-students', membership.universityId, targetId],
    queryFn: () => recruitmentApi.listEligibleStudents(membership.universityId, targetId!),
    enabled: !!targetId,
  })

  const request = requestsQuery.data?.find((candidate) => candidate.targetId === targetId)

  const nominateMutation = useMutation({
    mutationFn: (studentUserId: string) =>
      recruitmentApi.nominateStudent(membership.universityId, {
        opportunityId: request!.opportunityId,
        studentUserId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'eligible-students'] })
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'target-requests'] })
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'university-nominations'] })
    },
  })

  if (requestsQuery.isLoading || studentsQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!request) {
    return (
      <p className="px-4 py-10 text-center text-sm text-foreground-secondary">
        {t('recruitment:requests.notFound')}
      </p>
    )
  }

  const students = studentsQuery.data ?? []

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={request.opportunityTitle} description={request.organizationName} />
      <p className="mt-3 text-sm text-foreground-secondary">
        {t('recruitment:requests.progress', {
          current: request.liveNominationCount,
          requested: request.requestedNominees,
        })}{' '}
        · {t('recruitment:requests.deadline', { deadline: request.nominationDeadline })}
      </p>

      <h2 className="mt-8 text-sm font-semibold text-foreground">{t('recruitment:nominate.eligibleTitle')}</h2>
      <p className="mt-1 text-sm text-foreground-secondary">{t('recruitment:nominate.eligibleExplainer')}</p>

      {students.length === 0 ? (
        <EmptyState className="mt-8" title={t('recruitment:nominate.empty')} />
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {students.map((student) => (
            <li
              key={student.studentUserId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div>
                <p className="font-medium text-foreground">
                  {student.fullName ?? student.email ?? student.studentUserId}
                </p>
                <p className="text-xs text-foreground-secondary">
                  {student.studentNumber} · {student.program} · {student.academicYear}
                </p>
              </div>

              {student.alreadyNominated ? (
                <StatusBadge tone="success">{t('recruitment:nominate.alreadyNominated')}</StatusBadge>
              ) : (
                <Button
                  size="sm"
                  loading={nominateMutation.isPending && nominateMutation.variables === student.studentUserId}
                  disabled={nominateMutation.isPending}
                  onClick={() => nominateMutation.mutate(student.studentUserId)}
                >
                  {t('recruitment:nominate.nominate')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {nominateMutation.isError && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {apiErrorMessage(t, 'recruitment', 'nominate', nominateMutation.error)}
        </p>
      )}
    </PageContainer>
  )
}
