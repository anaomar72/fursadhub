/**
 * Route destinations for the internship area.
 *
 * <p>The internship lifecycle — candidacies, nominations, placements, weekly logs, attendance, evaluations, final reports and defences. Reached from the student, university and organization portals alike, so it is one shared area rather than a copy inside each.
 *
 * <p><strong>Why this barrel exists.</strong> The router reaches every page in this area through a
 * SINGLE dynamic import of this module, so the area is one chunk, fetched once, on the first
 * navigation into it. Importing each page directly produced a chunk per page — 83 of them — and on
 * a high-latency connection the resulting request chain measured slower than the unsplit bundle it
 * replaced. Grouping through bundler config instead was worse still: Vite emits a modulepreload
 * hint for every manual chunk, so every area downloaded on the public home page.
 *
 * <p>The PUBLIC pages are deliberately not here. They are statically imported by the router,
 * because they are what an unauthenticated first visit renders and a lazy boundary in front of the
 * landing hero costs a round trip before anything paints.
 *
 * <p>Adding a page here costs nothing extra at runtime. Adding one to the wrong area does: it moves
 * that code into an area whose visitors do not need it.
 */
export { ApplyPage } from '../../../features/recruitment/pages/ApplyPage'
export { MyApplicationsPage } from '../../../features/recruitment/pages/MyApplicationsPage'
export { CandidacyDetailPage } from '../../../features/recruitment/pages/CandidacyDetailPage'
export { MyNominationsPage } from '../../../features/recruitment/pages/MyNominationsPage'
export { OpportunityRequestsPage } from '../../../features/recruitment/pages/OpportunityRequestsPage'
export { NominateStudentsPage } from '../../../features/recruitment/pages/NominateStudentsPage'
export { UniversityNominationsPage } from '../../../features/recruitment/pages/UniversityNominationsPage'
export { CandidatePoolPage } from '../../../features/recruitment/pages/CandidatePoolPage'
export { OrganizationCandidatesPage } from '../../../features/recruitment/pages/OrganizationCandidatesPage'
export { CandidateDetailPage } from '../../../features/recruitment/pages/CandidateDetailPage'
export { MyPlacementsPage } from '../../../features/placements/pages/MyPlacementsPage'
export { StudentPlacementDetailPage } from '../../../features/placements/pages/StudentPlacementDetailPage'
export { UniversityPlacementsPage } from '../../../features/placements/pages/UniversityPlacementsPage'
export { OrganizationPlacementsPage } from '../../../features/placements/pages/OrganizationPlacementsPage'
export { PlacementDetailPage } from '../../../features/placements/pages/PlacementDetailPage'
export { PlacementWorkspace } from '../../../features/placements/components/PlacementWorkspace'
export { WeeklyLogsPage } from '../../../features/weekly-logs/pages/WeeklyLogsPage'
export { AttendancePage } from '../../../features/attendance/pages/AttendancePage'
export { EvaluationPage } from '../../../features/evaluations/pages/EvaluationPage'
export { FinalReportPage } from '../../../features/final-reports/pages/FinalReportPage'
export { DefensePage } from '../../../features/defense/pages/DefensePage'
export { OrganizationPlacementOverview } from '../../../features/placements/pages/OrganizationPlacementOverview'
