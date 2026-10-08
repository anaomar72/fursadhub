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
 * One organization under verification, and the place its review is actually done (Phase 8 layout).
 *
 * <p>Backed by {@code GET /admin/organizations/{organizationId}}. The facts the reviewer judges sit
 * on the left; the status and the commands its state allows sit on the right. The license is fetched
 * through the audited download route on request, never linked or auto-previewed — every read of a
 * private file is recorded (CLAUDE.md sections 47, 51), so opening it is the reviewer's deliberate act.
 */
export function AdminOrganizationDetailPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { organizationId = '' } = useParams()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const organizationQuery = useQuery(adminQueries.organization(organizationId))

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
    // Only after the API confirms: the badge re-renders from the refetched record, never from an
    // optimistic guess about what the transition did.
    onSuccess: (_result, { action }) => {
      invalidateInstitution(queryClient, 'organizations')
      toast.success(t(`admin:organizations.done.${action}`))
    },
  })

  const organization = organizationQuery.data
  const crumbs = [{ label: t('admin:organizations.title'), to: '/admin/organizations' }]

  if (organizationQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[...crumbs, { label: t('admin:organizations.organization') }]} />
        <AdminDetailSkeleton />
      </div>
    )
  }

  if (organizationQuery.isError || !organization) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[...crumbs, { label: t('admin:organizations.organization') }]} />
        <ErrorState
          title={t('common:status.error')}
          description={t('admin:organizations.notFound')}
          onRetry={() => void organizationQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      </div>
    )
  }

  const notProvided = t('common:status.notProvided')

  return (
    <AdminDetailLayout
      breadcrumbs={[...crumbs, { label: organization.name }]}
      eyebrow={t(`admin:organizationTypes.${organization.type}`, organization.type)}
      title={organization.name}
      status={
        <StatusBadge tone={INSTITUTION_STATUS_TONE[organization.verificationStatus]}>
          {t(`admin:statusLabels.${organization.verificationStatus}`)}
        </StatusBadge>
      }
      notice={error && <Alert tone="danger">{error}</Alert>}
      asideLabel={t('admin:organizations.review')}
      summary={
        <DetailSection title={t('admin:organizations.details')}>
          <DetailField label={t('admin:organizations.type')}>{t(`admin:organizationTypes.${organization.type}`, organization.type)}</DetailField>
          <DetailField label={t('admin:organizations.registrationNumber')}>{organization.registrationNumber ?? notProvided}</DetailField>
          <DetailField label={t('admin:organizations.website')}>
            {organization.website ? (
              <a
                href={organization.website}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-sm text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {organization.website}
              </a>
            ) : (
              notProvided
            )}
          </DetailField>
          <DetailField label={t('admin:organizations.registered')}>{formatDateTime(organization.createdAt)}</DetailField>
        </DetailSection>
      }
      aside={
        <>
          <Panel title={t('admin:verification.statusTitle')}>
            <InstitutionStatusFacts kind="organizations" institution={organization} />
          </Panel>
          <Panel title={t('admin:organizations.review')}>
            <InstitutionReviewActions
              kind="organizations"
              status={organization.verificationStatus}
              pending={transition.isPending}
              onRun={(action, note) => transition.mutate({ action, note })}
            />
          </Panel>
        </>
      }
      main={
        <InstitutionEvidencePanel
          kind="organizations"
          institution={organization}
          downloading={download.isPending}
          onOpen={() => download.mutate()}
        />
      }
    />
  )
}
