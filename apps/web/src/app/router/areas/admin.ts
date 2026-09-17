/**
 * Route destinations for the admin area.
 *
 * <p>The platform administration console. The largest area by some margin, and the one the fewest people ever open — which is precisely why it must not sit in everyone else's entry bundle.
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
export { AdminAreaLayout } from '../../../features/admin/components/AdminAreaLayout'
export { AdminDashboardPage } from '../../../features/admin/pages/AdminDashboardPage'
export { AdminOrganizationsPage } from '../../../features/admin/pages/AdminOrganizationsPage'
export { AdminUniversitiesPage } from '../../../features/admin/pages/AdminUniversitiesPage'
export { AdminEscalationsPage } from '../../../features/admin/pages/AdminEscalationsPage'
export { AdminUsersPage } from '../../../features/admin/pages/AdminUsersPage'
export { AdminOpportunitiesPage } from '../../../features/admin/pages/AdminOpportunitiesPage'
export { AdminPrivacyRequestsPage } from '../../../features/admin/pages/AdminPrivacyRequestsPage'
export { AdminLegalDocumentsPage } from '../../../features/admin/pages/AdminLegalDocumentsPage'
export { AdminTestimonialsPage } from '../../../features/admin/pages/AdminTestimonialsPage'
export { AdminAuditPage } from '../../../features/admin/pages/AdminAuditPage'
export { AdminPlatformRolesPage } from '../../../features/admin/pages/AdminPlatformRolesPage'
export { AdminUserDetailPage } from '../../../features/admin/pages/AdminUserDetailPage'
export { AdminOrganizationDetailPage } from '../../../features/admin/pages/AdminOrganizationDetailPage'
export { AdminUniversityDetailPage } from '../../../features/admin/pages/AdminUniversityDetailPage'
