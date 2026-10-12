import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge, Panel, StatusBadge } from '../../../../components/ui'
import { CANDIDACY_STATUS_TONE, NOMINATION_STATUS_TONE } from '../../../../lib/status/statusTones'
import { formatDate } from '../../../../lib/utils/formatDate'
import type { StudentCandidacyResponse, StudentNominationResponse } from '../../../recruitment/types'
import { ACTIVE_CANDIDACY_STATUSES } from '../../studentReadiness'

const LIMIT = 5

type Row =
  | { kind: 'candidacy'; at: string; live: boolean; candidacy: StudentCandidacyResponse }
  | { kind: 'nomination'; at: string; live: boolean; nomination: StudentNominationResponse }

/**
 * The student's recruitment at a glance: what is live first (pending decisions, active pipelines),
 * then the most recent of the rest, five rows at most — the full lists are one click away.
 *
 * <p>A nomination the student ACCEPTED has already become a candidacy (CLAUDE.md section 36), so
 * only nominations still waiting for consent are listed here; the candidacy row covers the rest.
 */
export function RecruitmentSummary({
  candidacies,
  nominations,
  className,
}: {
  candidacies: StudentCandidacyResponse[]
  nominations: StudentNominationResponse[]
  className?: string
}) {
  const { t } = useTranslation()

  const rows: Row[] = [
    ...nominations
      .filter((nomination) => nomination.status === 'PENDING_STUDENT_CONSENT')
      .map((nomination): Row => ({ kind: 'nomination', at: nomination.createdAt, live: true, nomination })),
    ...candidacies.map((candidacy): Row => ({
      kind: 'candidacy',
      at: candidacy.createdAt,
      live: ACTIVE_CANDIDACY_STATUSES.has(candidacy.status) || candidacy.liveOffer?.status === 'PENDING',
      candidacy,
    })),
  ]
    .sort((a, b) => Number(b.live) - Number(a.live) || b.at.localeCompare(a.at))
    .slice(0, LIMIT)

  return (
    <Panel
      title={t('student:journey.recruitment.title')}
      padding={rows.length === 0 ? 'default' : 'none'}
      className={className}
      action={
        <Link to="/student/applications" className="rounded-sm text-body font-semibold text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
          {t('student:journey.recruitment.viewApplications')}
        </Link>
      }
    >
      {rows.length === 0 ? (
        <div>
          <p className="text-body font-semibold text-foreground">{t('student:journey.recruitment.empty')}</p>
          <p className="mt-1 text-body text-foreground-secondary">{t('student:journey.recruitment.emptyHint')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) =>
            row.kind === 'candidacy' ? (
              <li key={`c-${row.candidacy.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5">
                <span className="min-w-0 flex-1">
                  <Link
                    to={`/student/applications/${row.candidacy.id}`}
                    className="block break-words rounded-sm text-body font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    {row.candidacy.opportunityTitle}
                  </Link>
                  <span className="mt-0.5 block text-caption text-foreground-secondary">
                    {t('recruitment:applications.appliedOn', { date: formatDate(row.candidacy.createdAt) })}
                  </span>
                </span>
                <StatusBadge tone={CANDIDACY_STATUS_TONE[row.candidacy.status]}>
                  {t(`recruitment:candidacyStatusValues.${row.candidacy.status}`)}
                </StatusBadge>
              </li>
            ) : (
              <li key={`n-${row.nomination.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5">
                <span className="min-w-0 flex-1">
                  <Link
                    to="/student/nominations"
                    className="block break-words rounded-sm text-body font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    {row.nomination.opportunityTitle ?? t('student:journey.recruitment.nominated')}
                  </Link>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-caption text-foreground-secondary">
                    <Badge>{t('student:journey.recruitment.nominated')}</Badge>
                    {row.nomination.organizationName}
                  </span>
                </span>
                <StatusBadge tone={NOMINATION_STATUS_TONE[row.nomination.status]}>
                  {t(`recruitment:nominationStatusValues.${row.nomination.status}`)}
                </StatusBadge>
              </li>
            ),
          )}
        </ul>
      )}
    </Panel>
  )
}
