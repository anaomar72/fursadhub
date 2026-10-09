import { useTranslation } from 'react-i18next'
import { Alert, Button, FileUpload, Icon, Panel, StatusBadge, Stepper } from '../ui'
import { INSTITUTION_VERIFICATION_TONE, type InstitutionVerificationState } from '../../lib/status/statusTones'
import { VerificationNextSteps } from './VerificationNextSteps'

export interface InstitutionVerificationPanelProps {
  /** Whose copy to read — the organization and university wording differ on purpose. */
  namespace: 'organization' | 'university'
  status: InstitutionVerificationState
  hasEvidence: boolean
  /** True for the institution's admin, the only role that can upload and submit. */
  canManage: boolean
  upload: { onFile: (file: File) => void; pending: boolean; error: string | null; lastFileName?: string | null }
  submit: { onSubmit: () => void; pending: boolean; error: string | null }
  className?: string
}

/**
 * Page-local guidance ("attach … below"): this panel sits on the profile, beside the upload. The
 * dashboard cue uses `verificationGate.statusGuidance` instead, which points AT the profile.
 */
const guidanceKey = (ns: InstitutionVerificationPanelProps['namespace'], status: InstitutionVerificationState) =>
  `${ns}:profile.statusGuidance.${status}`

/** The submit command is accepted from these two statuses only (see organizationVerificationGating.ts). */
const SUBMITTABLE: InstitutionVerificationState[] = ['DRAFT', 'NEEDS_CHANGES']
/** Statuses where the workflow is still moving, so progress is meaningful to draw. */
const IN_FLIGHT: InstitutionVerificationState[] = ['DRAFT', 'NEEDS_CHANGES', 'SUBMITTED', 'UNDER_REVIEW']

/**
 * Institution verification (CLAUDE.md section 31) as ONE place that answers, for every status:
 * what the status is, what it means, what the person can do, and what happens next.
 *
 * <p>It used to be split: a warning notice at the top of the profile pointing at "the organization
 * profile" (the page it was already on), and the upload-and-submit card at the very bottom, under
 * the whole profile form. A new admin had to scroll past a dozen unrelated fields to find the one
 * step that unlocks publishing. This panel sits directly under the page heading.
 *
 * <p>Honest by construction: the status is the exact backend status; the progress is drawn only
 * while the workflow is moving; no review duration is stated anywhere (FursadHub has none to
 * promise); and actions appear only where the server would accept them — upload and submit from
 * DRAFT or NEEDS_CHANGES, nothing but guidance from REJECTED/SUSPENDED/REVOKED.
 */
export function InstitutionVerificationPanel({ namespace, status, hasEvidence, canManage, upload, submit, className }: InstitutionVerificationPanelProps) {
  const { t } = useTranslation()
  const ns = namespace
  const submittable = SUBMITTABLE.includes(status)
  const verified = status === 'VERIFIED'

  const currentStep =
    status === 'SUBMITTED' || status === 'UNDER_REVIEW' ? 2 : hasEvidence ? 1 : 0

  return (
    <Panel
      title={t(`${ns}:profile.verificationTitle`)}
      action={
        <StatusBadge tone={INSTITUTION_VERIFICATION_TONE[status]}>
          {t(`${ns}:profile.verificationStatusValues.${status}`)}
        </StatusBadge>
      }
      className={className}
    >
      <div className="flex flex-col gap-6">
        {/* What the status MEANS, in words. */}
        {verified ? (
          <p className="flex max-w-prose items-start gap-2 text-body-lg text-foreground">
            <Icon name="badgeCheck" className="mt-0.5 size-5 shrink-0 text-success" />
            {t(`${ns}:profile.verifiedBody`)}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="max-w-prose text-body-lg text-foreground">{t(guidanceKey(ns, status))}</p>
            {/* Exactly the actions the server's verification guard gates — nothing more is implied. */}
            <p className="max-w-prose text-body text-foreground-secondary">{t(`${ns}:profile.verificationRestrictions`)}</p>
          </div>
        )}

        {IN_FLIGHT.includes(status) && (
          <Stepper
            orientation="horizontal"
            label={t('common:verification.progressLabel')}
            currentStep={currentStep}
            attention={status === 'NEEDS_CHANGES'}
            steps={[
              { label: t('common:verification.steps.upload') },
              { label: t('common:verification.steps.submit') },
              { label: t('common:verification.steps.review') },
              { label: t('common:verification.steps.verified') },
            ]}
          />
        )}

        {canManage && submittable && (
          <div className="flex flex-col gap-6 border-t border-border pt-6">
            <div>
              <p className="max-w-prose text-body text-foreground-secondary">{t(`${ns}:profile.submitForVerificationBody`)}</p>
              {/* PDF, 10MB: FileClassification.*_VERIFICATION_EVIDENCE. One file; a new upload replaces it. */}
              <FileUpload
                className="mt-4"
                label={t(`${ns}:profile.evidence.label`)}
                hint={t(`${ns}:profile.evidence.hint`)}
                accept="application/pdf"
                busy={upload.pending}
                busyLabel={t(`${ns}:profile.evidence.uploading`)}
                invalid={!!upload.error}
                current={
                  upload.lastFileName
                    ? t('common:verification.selectedFile', { name: upload.lastFileName })
                    : hasEvidence
                      ? t(`${ns}:profile.evidence.attached`)
                      : undefined
                }
                onFiles={(files) => files[0] && upload.onFile(files[0])}
              />
              <p className="mt-2 flex items-start gap-1.5 text-caption text-foreground-secondary">
                <Icon name="lock" className="mt-px size-3.5 shrink-0" />
                {t(`${ns}:profile.evidence.privacy`)}
              </p>
              {upload.error && (
                <p className="mt-2 flex items-start gap-1.5 text-body text-danger" role="alert">
                  <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
                  {upload.error}
                </p>
              )}
            </div>

            <VerificationNextSteps namespace={ns} />

            {submit.error && <Alert tone="danger">{submit.error}</Alert>}

            <div>
              <Button type="button" loading={submit.pending} disabled={!hasEvidence} onClick={submit.onSubmit} className="w-full sm:w-auto">
                {t(`${ns}:profile.submitForVerification`)}
              </Button>
              {!hasEvidence && <p className="mt-2 text-caption text-foreground-secondary">{t(`${ns}:profile.evidence.required`)}</p>}
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
