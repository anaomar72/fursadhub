import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Alert, Breadcrumbs, ErrorState, Panel, StatusBadge, useToast } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { AdminDetailSkeleton } from '../components/AdminSkeletons'
import * as adminApi from '../api/adminApi'
import { InstitutionReviewActions } from '../components/InstitutionReviewActions'
import { InstitutionEvidencePanel, InstitutionStatusFacts } from '../components/InstitutionDetailParts'
import { AdminDetailLayout, DetailSection } from '../components/AdminDetailLayout'
import { useEvidenceDownload } from '../hooks/useEvidenceDownload'
import { INSTITUTION_STATUS_TONE } from '../statusTone'
import { DetailField } from '../components/DetailField'
import { adminQueries, invalidateInstitution } from '../adminQueries'
import { formatDateTime } from '../../../lib/utils/formatDate'
import type { InstitutionAction } from '../institutionWorkflow'

/**
 * One university under verification, on the same record layout as an organization (Phase 8).
 *
 * <p>Backed by {@code GET /admin/universities/{universityId}}. The registration document is fetched
 * through the audited download route on request, never linked or auto-previewed (CLAUDE.md sections
 * 47, 51). The university's own operational screens — students, nominations, placements — are not
 * duplicated here: the platform reviews the institution, not its internal work.
 */
export function AdminUniversityDetailPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { universityId = '' } = useParams()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const universityQuery = useQuery(adminQueries.university(universityId))

  const download = useEvidenceDownload(
    () => adminApi.downloadUniversityEvidence(universityId),
    'university-registration',
    'universities',
    setError,
  )

  const transition = useMutation({
    mutationFn: ({ action, note }: { action: InstitutionAction; note?: string }) => {
      setError(null)
      return adminApi.universityTransition(universityId, action, note).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'universities', cause))
        throw cause
      })
    },
    // Only after the API confirms: the badge re-renders from the refetched record, never from an
    // optimistic guess about what the transition did.
    onSuccess: (_result, { action }) => {
      invalidateInstitution(queryClient, 'universities')
      toast.success(t(`admin:universities.done.${action}`))
    },
  })

  const university = universityQuery.data
  const crumbs = [{ label: t('admin:universities.title'), to: '/admin/universities' }]

  if (universityQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[...crumbs, { label: t('admin:universities.university') }]} />
        <AdminDetailSkeleton />
      </div>
    )
  }

  if (universityQuery.isError || !university) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[...crumbs, { label: t('admin:universities.university') }]} />
        <ErrorState
          title={t('common:status.error')}
          description={t('admin:universities.notFound')}
          onRetry={() => void universityQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      </div>
    )
  }

  const notProvided = t('common:status.notProvided')

  return (
    <AdminDetailLayout
      breadcrumbs={[...crumbs, { label: university.name }]}
      eyebrow={t('admin:universities.university')}
      title={university.name}
      status={
        <StatusBadge tone={INSTITUTION_STATUS_TONE[university.verificationStatus]}>
          {t(`admin:statusLabels.${university.verificationStatus}`)}
        </StatusBadge>
      }
      notice={error && <Alert tone="danger">{error}</Alert>}
      asideLabel={t('admin:universities.review')}
      summary={
        <DetailSection title={t('admin:universities.details')}>
          <DetailField label={t('admin:universities.city')}>{university.city ?? notProvided}</DetailField>
          <DetailField label={t('admin:universities.registrationNumber')}>{university.registrationNumber ?? notProvided}</DetailField>
          <DetailField label={t('admin:universities.website')}>
            {university.website ? (
              <a
                href={university.website}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-sm text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {university.website}
              </a>
            ) : (
              notProvided
            )}
          </DetailField>
          <DetailField label={t('admin:universities.registered')}>{formatDateTime(university.createdAt)}</DetailField>
        </DetailSection>
      }
      aside={
        <>
          <Panel title={t('admin:verification.statusTitle')}>
            <InstitutionStatusFacts kind="universities" institution={university} />
          </Panel>
          <Panel title={t('admin:universities.review')}>
            <InstitutionReviewActions
              kind="universities"
              status={university.verificationStatus}
              pending={transition.isPending}
              onRun={(action, note) => transition.mutate({ action, note })}
            />
          </Panel>
        </>
      }
      main={
        <InstitutionEvidencePanel
          kind="universities"
          institution={university}
          downloading={download.isPending}
          onOpen={() => download.mutate()}
        />
      }
    />
  )
}
