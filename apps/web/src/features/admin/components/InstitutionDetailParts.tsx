import { useTranslation } from 'react-i18next'
import { Button, Icon, Panel } from '../../../components/ui'
import { formatDateTime } from '../../../lib/utils/formatDate'
import { awaitingReview } from '../institutionWorkflow'
import { DetailField } from './DetailField'
import type { InstitutionVerificationStatus } from '../types'

/**
 * Presentation shared by the organization and university records (Phase 8). Both carry the same
 * verification fields on the wire, so these take only those fields; the institution-specific facts
 * (an organization's type, a university's city) stay on each page.
 */
interface VerifiableInstitution {
  verificationStatus: InstitutionVerificationStatus
  verifiedAt: string | null
  hasEvidence: boolean
  evidenceUploadedAt: string | null
  createdAt: string
}

/** Where the record stands, and whose move it is — the verification state in plain words. */
export function InstitutionStatusFacts({ kind, institution }: { kind: 'organizations' | 'universities'; institution: VerifiableInstitution }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-foreground-secondary">{t(`admin:verification.stateHelp.${institution.verificationStatus}`)}</p>
      <dl className="flex flex-col gap-3">
        <DetailField label={t(`admin:${kind}.verifiedAt`)}>
          {institution.verifiedAt ? formatDateTime(institution.verifiedAt) : t(`admin:${kind}.notVerified`)}
        </DetailField>
        <DetailField label={t('admin:verification.evidenceOnFile')}>
          {institution.hasEvidence ? formatDateTime(institution.evidenceUploadedAt) : t(`admin:${kind}.noEvidence`)}
        </DetailField>
      </dl>
    </div>
  )
}

/**
 * The verification document. Opened on request through the audited download route — never linked
 * to storage and never auto-previewed, because every read is recorded as a private-file access.
 */
export function InstitutionEvidencePanel({
  kind,
  institution,
  downloading,
  onOpen,
}: {
  kind: 'organizations' | 'universities'
  institution: VerifiableInstitution
  downloading: boolean
  onOpen: () => void
}) {
  const { t } = useTranslation()
  return (
    <Panel title={t(`admin:${kind}.evidence`)} description={t('admin:verification.evidenceAudited')}>
      {institution.hasEvidence ? (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-body text-foreground">
            <Icon name="document" className="size-4 shrink-0 text-foreground-secondary" />
            {t(`admin:${kind}.evidenceUploaded`, { date: formatDateTime(institution.evidenceUploadedAt) })}
          </p>
          <Button variant="outline" size="sm" className="self-start" loading={downloading} onClick={onOpen}>
            {t(kind === 'organizations' ? 'admin:organizations.viewLicense' : 'admin:universities.viewDocument')}
          </Button>
        </div>
      ) : (
        <p className="text-body text-foreground-secondary">
          {awaitingReview(institution.verificationStatus) ? t('admin:verification.noEvidenceAwaiting') : t(`admin:${kind}.noEvidenceHint`)}
        </p>
      )}
    </Panel>
  )
}
