import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { InternshipCard, StatusBadge } from '../../../components/ui'
import * as organizationApi from '../../organization/api/organizationApi'
import { formatCompensation } from '../../opportunities/compensation'
import type { PublicOpportunityResponse } from '../../opportunities/types'
import { BookmarkButton } from './BookmarkButton'

export interface StudentOpportunityCardProps {
  opportunity: PublicOpportunityResponse
  saved: boolean
  /** Hidden when the viewer has no saved-internships capability. */
  bookmarkAvailable?: boolean
  /** Renders the "Applied" marker, so the student is not invited into a pipeline they are already in. */
  applied?: boolean
  /** Extra footer content — the saved list adds "Saved on …". */
  footer?: React.ReactNode
}

/**
 * One internship as the STUDENT sees it: the approved marketplace card plus the two things that
 * only exist for a signed-in student — a bookmark and their own application state.
 *
 * <p>Shared by internship discovery and the Saved Internships list on purpose. Both render the same
 * `PublicOpportunityResponse` (the saved endpoint deliberately reuses that exact representation),
 * so a second card would only be a second thing to keep in step.
 */
export function StudentOpportunityCard({
  opportunity,
  saved,
  bookmarkAvailable = true,
  applied = false,
  footer,
}: StudentOpportunityCardProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'

  const durationMonths = Math.max(
    1,
    Math.round(
      (new Date(opportunity.endDate).getTime() - new Date(opportunity.startDate).getTime()) /
        (1000 * 60 * 60 * 24 * 30),
    ),
  )

  const compensation = formatCompensation(opportunity.compensation, t, locale)

  return (
    <InternshipCard
      title={opportunity.title}
      organization={opportunity.organization.name}
      organizationVerified={opportunity.organization.verified}
      logo={
        opportunity.organization.hasLogo ? (
          <img
            src={organizationApi.organizationLogoUrl(opportunity.organization.id)}
            alt=""
            className="size-full rounded object-contain"
          />
        ) : undefined
      }
      titleTo={`/student/opportunities/${opportunity.id}`}
      location={opportunity.location ?? undefined}
      duration={t('opportunities:public.durationMonths', { count: durationMonths })}
      workMode={t(`opportunities:workModeValues.${opportunity.workMode}`)}
      compensation={compensation ?? undefined}
      hours={
        opportunity.hoursPerWeek
          ? t('opportunities:enrichment.hoursPerWeekShort', { count: opportunity.hoursPerWeek })
          : undefined
      }
      // Skills are the closest real thing to the approved card's category chips. Capped at three so
      // a 20-skill internship does not push the card's footer off the grid row.
      tags={(opportunity.skills ?? []).slice(0, 3)}
      bookmark={
        <BookmarkButton opportunityId={opportunity.id} saved={saved} available={bookmarkAvailable} />
      }
      deadline={
        footer ??
        (opportunity.applicationDeadline
          ? t('opportunities:public.applyBy', {
              date: new Intl.DateTimeFormat(locale === 'so' ? 'so-SO' : 'en', { dateStyle: 'medium' }).format(
                new Date(opportunity.applicationDeadline),
              ),
            })
          : undefined)
      }
      actions={
        <span className="flex items-center gap-2">
          {applied && <StatusBadge tone="info">{t('opportunities:browse.applied')}</StatusBadge>}
          <Link
            to={`/student/opportunities/${opportunity.id}`}
            className="inline-flex h-9 items-center rounded-lg border border-border-strong px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
          >
            {t('opportunities:public.viewDetails')}
          </Link>
        </span>
      }
    >
      <p className="line-clamp-2">{opportunity.description}</p>
    </InternshipCard>
  )
}
