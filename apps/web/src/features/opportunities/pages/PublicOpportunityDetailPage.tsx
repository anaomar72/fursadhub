import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as publicOpportunityApi from '../api/publicOpportunityApi'
import { LoadingSpinner } from '../../../components/ui'

export function PublicOpportunityDetailPage() {
  const { t } = useTranslation()
  const { opportunityId } = useParams<{ opportunityId: string }>()

  const opportunityQuery = useQuery({
    queryKey: ['public-opportunities', 'detail', opportunityId],
    queryFn: () => publicOpportunityApi.getPublicOpportunity(opportunityId!),
    enabled: !!opportunityId,
    retry: false,
  })

  if (opportunityQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (opportunityQuery.isError || !opportunityQuery.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-foreground-secondary">{t('opportunities:public.notFound')}</p>
        <Link to="/opportunities" className="mt-4 inline-block text-sm font-medium text-brand-primary hover:underline">
          {t('opportunities:public.backToList')}
        </Link>
      </div>
    )
  }

  const opportunity = opportunityQuery.data

  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-foreground-secondary">{opportunity.organization.name}</p>
      <h1 className="mt-1 text-2xl font-semibold text-foreground">{opportunity.title}</h1>

      <dl className="mt-6 grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-4 text-sm">
        <Row label={t('opportunities:form.workModeLabel')} value={t(`opportunities:workModeValues.${opportunity.workMode}`)} />
        {opportunity.location && <Row label={t('opportunities:form.locationLabel')} value={opportunity.location} />}
        <Row label={t('opportunities:form.openingsLabel')} value={String(opportunity.numberOfOpenings)} />
        <Row label={t('opportunities:form.startDateLabel')} value={opportunity.startDate} />
        <Row label={t('opportunities:form.endDateLabel')} value={opportunity.endDate} />
        {opportunity.applicationDeadline && (
          <Row label={t('opportunities:form.applicationDeadlineLabel')} value={opportunity.applicationDeadline} />
        )}
      </dl>

      <Section title={t('opportunities:form.descriptionLabel')} body={opportunity.description} />
      {opportunity.responsibilities && <Section title={t('opportunities:form.responsibilitiesLabel')} body={opportunity.responsibilities} />}
      {opportunity.requirements && <Section title={t('opportunities:form.requirementsLabel')} body={opportunity.requirements} />}
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-foreground-secondary">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm text-foreground-secondary">{body}</p>
    </section>
  )
}
