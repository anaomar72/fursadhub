import { useTranslation } from 'react-i18next'
import { Badge, Icon } from '../../../components/ui'
import { formatCompensation } from '../compensation'
import type { CompensationResponse } from '../types'

export interface OpportunityEnrichmentProps {
  compensation?: CompensationResponse | null
  hoursPerWeek?: number | null
  /**
   * Always present on a current API response, and still tolerated as absent: an opportunity read
   * from a pre-B3 cache has no such key, and a missing list is a reason to render nothing rather
   * than to take down the page it appears on.
   */
  skills?: string[] | null
  perks?: string[] | null
  className?: string
}

/**
 * The Backend Phase B3 facts about an internship — what it pays, how many hours a week, which
 * skills it is looking for and what it offers (`compensation`, `hoursPerWeek`, `skills`, `perks`).
 *
 * <p>Renders nothing at all when the organization supplied none of them. Every section is
 * individually conditional for the same reason: an internship that lists skills but says nothing
 * about pay shows skills and no empty "Compensation —" row. A blank compensation means UNKNOWN,
 * which the API keeps deliberately distinct from an explicit `UNPAID`, so inventing a placeholder
 * here would misstate an offer.
 */
export function OpportunityEnrichment({
  compensation,
  hoursPerWeek,
  skills: rawSkills,
  perks: rawPerks,
  className,
}: OpportunityEnrichmentProps) {
  const { t, i18n } = useTranslation()
  const pay = formatCompensation(compensation, t, i18n.resolvedLanguage ?? 'en')
  const skills = rawSkills ?? []
  const perks = rawPerks ?? []

  if (!pay && !hoursPerWeek && skills.length === 0 && perks.length === 0) return null

  return (
    <section className={className}>
      <h2 className="font-display text-title-panel text-foreground">
        {t('opportunities:enrichment.title')}
      </h2>

      {(pay || hoursPerWeek) && (
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
          {pay && (
            <div className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                <Icon name="coins" className="size-3.5" />
                {t('opportunities:enrichment.compensationLabel')}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{pay}</dd>
            </div>
          )}
          {hoursPerWeek ? (
            <div className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                <Icon name="clock" className="size-3.5" />
                {t('opportunities:enrichment.hoursPerWeekLabel')}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {t('opportunities:enrichment.hoursPerWeekValue', { count: hoursPerWeek })}
              </dd>
            </div>
          ) : null}
        </dl>
      )}

      {skills.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
            {t('opportunities:enrichment.skillsLabel')}
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <li key={skill}>
                <Badge tone="brand">{skill}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {perks.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
            {t('opportunities:enrichment.perksLabel')}
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {perks.map((perk) => (
              <li key={perk}>
                <Badge>{perk}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
