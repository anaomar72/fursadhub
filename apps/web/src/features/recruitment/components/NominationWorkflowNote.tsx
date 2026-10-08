import { useTranslation } from 'react-i18next'

/** How a request becomes an internship — the real sequence, so nobody expects automation. */
export function NominationWorkflowNote() {
  const { t } = useTranslation()
  const steps = ['request', 'nominate', 'consent', 'recruit'] as const
  return (
    <ol className="grid gap-3 rounded-lg border border-border bg-surface-muted p-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={t('recruitment:requests.workflow.label')}>
      {steps.map((step, index) => (
        <li key={step} className="flex min-w-0 gap-2.5">
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-caption font-semibold text-foreground">
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-label text-foreground">{t(`recruitment:requests.workflow.${step}.title`)}</span>
            <span className="mt-0.5 block text-caption text-foreground-secondary">{t(`recruitment:requests.workflow.${step}.body`)}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
