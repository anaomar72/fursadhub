import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import {
  Breadcrumbs,
  Button,
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'
import { InstitutionReviewActions } from '../components/InstitutionReviewActions'
import { useEvidenceDownload } from '../hooks/useEvidenceDownload'
import { INSTITUTION_STATUS_TONE } from '../statusTone'
import { DetailField } from '../components/DetailField'
import { formatDateTime } from '../../../lib/utils/formatDate'
import type { InstitutionAction } from '../institutionWorkflow'

/**
 * One university under verification, and the place its review is actually done.
 *
 * <p>Backed by {@code GET /admin/universities/{universityId}} — already on
 * {@code AdminUniversityController}, never previously called by the web app, which is why the
 * console could only ever review from a list row.
 *
 * <p>The registration/accreditation document is fetched through the audited download route, never
 * linked to directly: object storage is private and every read of a private file is recorded
 * (CLAUDE.md sections 47, 51).
 */
export function AdminUniversityDetailPage() {
  const { t } = useTranslation()
  const { universityId = '' } = useParams()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const universityQuery = useQuery({
    queryKey: ['admin', 'universities', 'detail', universityId],
    queryFn: () => adminApi.getUniversity(universityId),
  })

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
    // Only after the API confirms: the badge above re-renders from the refetched record, never from
    // an optimistic guess about what the transition did.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'universities'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
    },
  })

  const university = universityQuery.data

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('admin:universities.title'), to: '/admin/universities' },
          { label: university?.name ?? t('admin:universities.university') },
        ]}
      />

      {universityQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : universityQuery.isError || !university ? (
        <ErrorState
          title={t('common:status.error')}
          description={t('admin:universities.notFound')}
          onRetry={() => void universityQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <PageHeader
            eyebrow={t('admin:universities.university')}
            title={university.name}
            actions={
              <StatusBadge tone={INSTITUTION_STATUS_TONE[university.verificationStatus]}>
                {t(`admin:statusLabels.${university.verificationStatus}`)}
              </StatusBadge>
            }
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card padding="lg" className="flex flex-col gap-4">
              <h2 className="font-semibold text-foreground">{t('admin:universities.details')}</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailField label={t('admin:universities.city')}>
                  {university.city ?? t('common:status.notProvided')}
                </DetailField>
                <DetailField label={t('admin:universities.registrationNumber')}>
                  {university.registrationNumber ?? t('common:status.notProvided')}
                </DetailField>
                <DetailField label={t('admin:universities.website')}>
                  {university.website ? (
                    <a
                      href={university.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      {university.website}
                    </a>
                  ) : (
                    t('common:status.notProvided')
                  )}
                </DetailField>
                <DetailField label={t('admin:universities.registered')}>
                  {formatDateTime(university.createdAt)}
                </DetailField>
                <DetailField label={t('admin:universities.verifiedAt')}>
                  {university.verifiedAt
                    ? formatDateTime(university.verifiedAt)
                    : t('admin:universities.notVerified')}
                </DetailField>
              </dl>
            </Card>

            <div className="flex flex-col gap-4">
              <Card padding="lg" className="flex flex-col gap-3">
                <h2 className="font-semibold text-foreground">{t('admin:universities.evidence')}</h2>
                {university.hasEvidence ? (
                  <>
                    <p className="text-sm text-foreground-secondary">
                      {t('admin:universities.evidenceUploaded', {
                        date: formatDateTime(university.evidenceUploadedAt),
                      })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      loading={download.isPending}
                      onClick={() => download.mutate()}
                    >
                      {t('admin:universities.viewLicense')}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted">{t('admin:universities.noEvidenceHint')}</p>
                )}
              </Card>

              <Card padding="lg" className="flex flex-col gap-3">
                <h2 className="font-semibold text-foreground">{t('admin:universities.review')}</h2>
                <InstitutionReviewActions
                  kind="universities"
                  status={university.verificationStatus}
                  pending={transition.isPending}
                  error={error}
                  onRun={(action, note) => transition.mutate({ action, note })}
                />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
