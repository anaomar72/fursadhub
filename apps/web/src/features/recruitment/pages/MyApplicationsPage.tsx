import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { CANDIDACY_STATUS_TONE } from '../components/statusTone'
import { LoadingSpinner, StatusBadge } from '../../../components/ui'

/**
 * The student's own applications and nominations-turned-candidacies, in ONE list — mirroring the
 * unified pipeline on the backend (CLAUDE.md section 36). The `source` column tells the student how
 * each one started.
 */
export function MyApplicationsPage() {
  const { t } = useTranslation()

  const candidaciesQuery = useQuery({
    queryKey: ['recruitment', 'my-candidacies'],
    queryFn: recruitmentApi.listMyCandidacies,
  })

  if (candidaciesQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const candidacies = candidaciesQuery.data ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{t('recruitment:applications.title')}</h1>

      {candidacies.length === 0 ? (
        <p className="mt-8 text-center text-sm text-foreground-secondary">
          {t('recruitment:applications.empty')}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {candidacies.map((candidacy) => (
            <li key={candidacy.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    to={`/student/applications/${candidacy.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {candidacy.opportunityTitle}
                  </Link>
                  <p className="mt-1 text-xs text-foreground-secondary">
                    {t(`recruitment:sourceValues.${candidacy.source}`)}
                  </p>
                </div>
                <StatusBadge tone={CANDIDACY_STATUS_TONE[candidacy.status]}>
                  {t(`recruitment:candidacyStatusValues.${candidacy.status}`)}
                </StatusBadge>
              </div>

              {candidacy.liveOffer?.status === 'PENDING' && (
                <p className="mt-3 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
                  {t('recruitment:applications.offerAwaitingResponse', {
                    deadline: candidacy.liveOffer.responseDeadline,
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
