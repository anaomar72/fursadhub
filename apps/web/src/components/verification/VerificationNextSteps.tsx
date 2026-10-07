import { useTranslation } from 'react-i18next'

export interface VerificationNextStepsProps {
  /** Whose institution-verification copy to read (`<namespace>:profile.verificationNext.*`). */
  namespace: 'organization' | 'university'
}

/**
 * "What happens next" for institution verification (CLAUDE.md section 31), shown beside the
 * submit-for-verification button so the step after it is never a guess.
 *
 * <p>Every line describes what the API actually does: the submit command needs the evidence on file,
 * a platform reviewer (SUPER_ADMIN or VERIFICATION_OFFICER) decides, and the decision reaches the
 * institution's admins as an in-app notification (AdminInstitutionVerificationService /
 * AdminUniversityVerificationService). No review duration is stated — FursadHub has none to promise.
 */
export function VerificationNextSteps({ namespace }: VerificationNextStepsProps) {
  const { t } = useTranslation()
  const steps = ['attach', 'review', 'notify'] as const

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{t(`${namespace}:profile.verificationNext.title`)}</h3>
      <ol className="mt-2 flex list-decimal flex-col gap-1 ps-5 text-sm text-foreground-secondary">
        {steps.map((step) => (
          <li key={step}>{t(`${namespace}:profile.verificationNext.${step}`)}</li>
        ))}
      </ol>
    </div>
  )
}
