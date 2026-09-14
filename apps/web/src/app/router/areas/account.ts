/**
 * Route destinations for the account area.
 *
 * <p>Cross-role account surfaces: profile, notifications, privacy requests and the visitor's own testimonial. Reachable from every portal, so it belongs to none of them.
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
export { MyTestimonialPage } from '../../../features/testimonials/pages/MyTestimonialPage'
export { AccountProfilePage } from '../../../features/account/pages/AccountProfilePage'
export { NotificationsPage } from '../../../features/notifications/pages/NotificationsPage'
export { PrivacyPage } from '../../../features/privacy/pages/PrivacyPage'
