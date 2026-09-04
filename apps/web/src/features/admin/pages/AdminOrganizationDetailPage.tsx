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
 * One organization under verification, and the place its review is actually done.
 *
 * <p>Backed by {@code GET /admin/organizations/{organizationId}} — already on
 * {@code AdminOrganizationController}, never previously called by the web app, which is why the
 * console could only ever review from a list row.
 *
 * <p>The license is fetched through the audited download route, never linked to directly: object
 * storage is private and every read of a private file is recorded (CLAUDE.md sections 47, 51).
 */
export function AdminOrganizationDetailPage() {
  const { t } = useTranslation()
  const { organizationId = '' } = useParams()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const organizationQuery = useQuery({
    queryKey: ['admin', 'organizations', 'detail', organizationId],
    queryFn: () => adminApi.getOrganization(organizationId),
  })

  const download = useEvidenceDownload(
    () => adminApi.downloadOrganizationEvidence(organizationId),
    'organization-license',
    'organizations',
    setError,
  )

  const transition = useMutation({
    mutationFn: ({ action, note }: { action: InstitutionAction; note?: string }) => {
      setError(null)
      return adminApi.organizationTransition(organizationId, action, note).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'organizations', cause))
        throw cause
      })
    },
    // Only after the API confirms: the badge above re-renders from the refetched record, never from
    // an optimistic guess about what the transition did.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
    },
  })

  const organization = organizationQuery.data

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('admin:organizations.title'), to: '/admin/organizations' },
          { label: organization?.name ?? t('admin:organizations.organization') },
        ]}
      />

      {organizationQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : organizationQuery.isError || !organization ? (
        <ErrorState
          title={t('common:status.error')}
          description={t('admin:organizations.notFound')}
          onRetry={() => void organizationQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <PageHeader
            eyebrow={t(`admin:organizationTypes.${organization.type}`, organization.type)}
            title={organization.name}
            actions={
              <StatusBadge tone={INSTITUTION_STATUS_TONE[organization.verificationStatus]}>
                {t(`admin:statusLabels.${organization.verificationStatus}`)}
              </StatusBadge>
            }
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card padding="lg" className="flex flex-col gap-4">
              <h2 className="font-semibold text-foreground">{t('admin:organizations.details')}</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailField label={t('admin:organizations.type')}>
                  {t(`admin:organizationTypes.${organization.type}`, organization.type)}
                </DetailField>
                <DetailField label={t('admin:organizations.registrationNumber')}>
                  {organization.registrationNumber ?? t('common:status.notProvided')}
                </DetailField>
                <DetailField label={t('admin:organizations.website')}>
                  {organization.website ? (
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      {organization.website}
                    </a>
                  ) : (
                    t('common:status.notProvided')
                  )}
                </DetailField>
                <DetailField label={t('admin:organizations.registered')}>
                  {formatDateTime(organization.createdAt)}
                </DetailField>
                <DetailField label={t('admin:organizations.verifiedAt')}>
                  {organization.verifiedAt
                    ? formatDateTime(organization.verifiedAt)
                    : t('admin:organizations.notVerified')}
                </DetailField>
              </dl>
            </Card>

            <div className="flex flex-col gap-4">
              <Card padding="lg" className="flex flex-col gap-3">
                <h2 className="font-semibold text-foreground">{t('admin:organizations.evidence')}</h2>
                {organization.hasEvidence ? (
                  <>
                    <p className="text-sm text-foreground-secondary">
                      {t('admin:organizations.evidenceUploaded', {
                        date: formatDateTime(organization.evidenceUploadedAt),
                      })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      loading={download.isPending}
                      onClick={() => download.mutate()}
                    >
                      {t('admin:organizations.viewLicense')}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted">{t('admin:organizations.noEvidenceHint')}</p>
                )}
              </Card>

              <Card padding="lg" className="flex flex-col gap-3">
                <h2 className="font-semibold text-foreground">{t('admin:organizations.review')}</h2>
                <InstitutionReviewActions
                  kind="organizations"
                  status={organization.verificationStatus}
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
