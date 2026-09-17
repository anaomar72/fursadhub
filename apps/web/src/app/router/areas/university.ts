/**
 * Route destinations for the university area.
 *
 * <p>The university portal: departments, students, verification queue, staff, partners, policy and supervision.
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
export { UniversityAreaLayout } from '../../../features/university/components/UniversityAreaLayout'
export { DashboardPage as UniversityDashboardPage } from '../../../features/university/pages/DashboardPage'
export { DepartmentsPage } from '../../../features/university/pages/DepartmentsPage'
export { UniversityProfilePage } from '../../../features/university/pages/UniversityProfilePage'
export { StudentsPage } from '../../../features/university/pages/StudentsPage'
export { VerificationQueuePage } from '../../../features/university/pages/VerificationQueuePage'
export { VerificationCaseDetailPage } from '../../../features/university/pages/VerificationCaseDetailPage'
export { StaffPage } from '../../../features/university/pages/StaffPage'
export { PartnerOrganizationsPage } from '../../../features/university/pages/PartnerOrganizationsPage'
export { SupervisedStudentsPage } from '../../../features/university/pages/SupervisedStudentsPage'
export { SupervisionQueuePage } from '../../../features/university/pages/SupervisionQueuePage'
export { InternshipPolicyPage } from '../../../features/university/pages/InternshipPolicyPage'
