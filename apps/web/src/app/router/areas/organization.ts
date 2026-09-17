/**
 * Route destinations for the organization area.
 *
 * <p>The organization portal: dashboard, profile, staff, partners, supervision and the opportunities it publishes.
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
export { OrganizationAreaLayout } from '../../../features/organization/components/OrganizationAreaLayout'
export { DashboardPage as OrganizationDashboardPage } from '../../../features/organization/pages/DashboardPage'
export { ProfilePage as OrganizationProfilePage } from '../../../features/organization/pages/ProfilePage'
export { StaffPage as OrganizationStaffPage } from '../../../features/organization/pages/StaffPage'
export { OpportunityListPage } from '../../../features/opportunities/pages/OpportunityListPage'
export { CreateOpportunityPage } from '../../../features/opportunities/pages/CreateOpportunityPage'
export { OpportunityDetailPage } from '../../../features/opportunities/pages/OpportunityDetailPage'
export { UniversityPartnersPage } from '../../../features/organization/pages/UniversityPartnersPage'
export { SupervisionQueuePage as OrganizationSupervisionQueuePage } from '../../../features/organization/pages/SupervisionQueuePage'
