import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CARD_GRID, InternshipCard, SkeletonCardGrid } from '../../../components/ui'
import * as organizationApi from '../../organization/api/organizationApi'
import { PublicBookmark } from '../../student/components/PublicBookmarks'
import { formatCompensation } from '../compensation'
import type { PublicOpportunityResponse } from '../types'

/** The shared public card grid (see `CARD_GRID`). */
export const OPPORTUNITY_GRID = CARD_GRID

function whole(dateIso: string): number {
  return new Date(`${dateIso}T23:59:59Z`).getTime()
}

/** Calendar months between start and end, never below one. */
function durationMonths(start: string, end: string): number {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24 * 30)))
}

/**
 * A published internship as a card, linked by its title to the public detail page.
 *
 * <p>Everything it shows comes from the public opportunity payload. A deadline that has already
 * passed says so instead of inviting an application the backend would refuse.
 */
export function PublicOpportunityCard({
  opportunity,
  density = 'comfortable',
}: {
  opportunity: PublicOpportunityResponse
  density?: 'comfortable' | 'compact'
}) {
  const { t, i18n } = useTranslation()
  const [now] = useState(() => Date.now())
  const locale = i18n.language?.startsWith('so') ? 'so-SO' : 'en'
  const formatDate = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso))

  const deadline = opportunity.applicationDeadline
    ? whole(opportunity.applicationDeadline) < now
      ? t('opportunities:public.closed')
      : t('opportunities:public.applyBy', { date: formatDate(opportunity.applicationDeadline) })
    : undefined

  return (
    <InternshipCard
      density={density}
      titleTo={`/opportunities/${opportunity.id}`}
      bookmark={<PublicBookmark id={opportunity.id} />}
      title={opportunity.title}
      organization={opportunity.organization.name}
      organizationVerified={opportunity.organization.verified}
      logo={
        opportunity.organization.hasLogo ? (
          <img
            src={organizationApi.organizationLogoUrl(opportunity.organization.id)}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-contain p-1"
          />
        ) : undefined
      }
      location={opportunity.location ?? undefined}
      workMode={t(`opportunities:workModeValues.${opportunity.workMode}`)}
      duration={t('opportunities:public.durationMonths', { count: durationMonths(opportunity.startDate, opportunity.endDate) })}
      compensation={density === 'comfortable' ? (formatCompensation(opportunity.compensation, t, locale) ?? undefined) : undefined}
      tags={(opportunity.skills ?? []).slice(0, 3)}
      deadline={deadline}
    />
  )
}

/** Card-shaped placeholders in the same grid, announced once. */
export function OpportunityGridSkeleton({ count = 3, label, className }: { count?: number; label?: string; className?: string }) {
  return <SkeletonCardGrid count={count} label={label} className={className} />
}
