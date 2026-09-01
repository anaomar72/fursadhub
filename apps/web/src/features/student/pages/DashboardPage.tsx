import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as studentApi from '../api/studentApi'
import * as recruitmentApi from '../../recruitment/api/recruitmentApi'
import * as placementsApi from '../../placements/api/placementsApi'
import { DashboardActionCard, LoadingSpinner, PageHeader } from '../../../components/ui'

const ACTIVE_CANDIDACY_STATUSES = new Set([
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
  'ACCEPTED',
])
const ACTIVE_PLACEMENT_STATUSES = new Set(['PLANNED', 'ACTIVE', 'COMPLETION_PENDING'])

/**
 * The student's at-a-glance home (BRAND_AND_UI_GUIDELINES.md section 7): enrollment status,
 * applications, nominations and offers awaiting a response, and an active placement — the things
 * that actually need attention, not decorative charts. Composed entirely from data every other
 * student page already fetches; no new backend endpoint.
 */
export function DashboardPage() {
  const { t } = useTranslation()

  const enrollmentQuery = useQuery({ queryKey: ['student', 'enrollment'], queryFn: studentApi.getMyEnrollment, retry: false })
  const candidaciesQuery = useQuery({ queryKey: ['student', 'candidacies'], queryFn: recruitmentApi.listMyCandidacies })
  const nominationsQuery = useQuery({ queryKey: ['student', 'nominations'], queryFn: recruitmentApi.listMyNominations })
  const offersQuery = useQuery({ queryKey: ['student', 'offers'], queryFn: recruitmentApi.listMyOffers })
  const placementsQuery = useQuery({ queryKey: ['student', 'placements'], queryFn: placementsApi.listMyPlacements })

  const isLoading =
    enrollmentQuery.isLoading || candidaciesQuery.isLoading || nominationsQuery.isLoading ||
    offersQuery.isLoading || placementsQuery.isLoading

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const verificationStatus = enrollmentQuery.data?.verificationStatus ?? null
  const isVerified = verificationStatus === 'VERIFIED'

  const activeApplications = (candidaciesQuery.data ?? []).filter((c) => ACTIVE_CANDIDACY_STATUSES.has(c.status)).length
  const pendingNominations = (nominationsQuery.data ?? []).filter((n) => n.status === 'PENDING_STUDENT_CONSENT').length
  const pendingOffers = (offersQuery.data ?? []).filter((o) => o.status === 'PENDING').length
  const activePlacements = (placementsQuery.data ?? []).filter((p) => ACTIVE_PLACEMENT_STATUSES.has(p.status)).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('student:dashboard.title')} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardActionCard
          label={t('student:dashboard.enrollment')}
          value={isVerified ? 1 : 0}
          to="/student/enrollment"
          tone={isVerified ? 'success' : 'warning'}
          statusLabel={isVerified ? t('student:dashboard.verified') : t('student:dashboard.notVerified')}
        />
        <DashboardActionCard
          label={t('student:dashboard.applications')}
          value={activeApplications}
          to="/student/applications"
          tone="info"
          statusLabel={t('student:dashboard.inProgress')}
        />
        <DashboardActionCard
          label={t('student:dashboard.nominations')}
          value={pendingNominations}
          to="/student/nominations"
          tone={pendingNominations > 0 ? 'warning' : 'success'}
          statusLabel={pendingNominations > 0 ? t('student:dashboard.needsAction') : t('student:dashboard.clear')}
        />
        <DashboardActionCard
          label={t('student:dashboard.offers')}
          value={pendingOffers}
          to="/student/applications"
          tone={pendingOffers > 0 ? 'warning' : 'success'}
          statusLabel={pendingOffers > 0 ? t('student:dashboard.needsAction') : t('student:dashboard.clear')}
        />
        <DashboardActionCard
          label={t('student:dashboard.placements')}
          value={activePlacements}
          to="/student/placements"
          tone="info"
          statusLabel={t('student:dashboard.active')}
        />
      </div>
    </div>
  )
}
