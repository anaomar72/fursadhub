# Astra Phase 2 — Public website transformation

Date: 2026-10-12. Worktree: `C:/Users/hp/Documents/fursadhub-astra`.

## Git and preservation

Branch: `feat/astra-premium-ui-redesign`.
HEAD: `4b7b9ab4a8171b6fb3b3aa7cc9e1cb4b56899786` (unchanged).

The working tree contains uncommitted Phase 1 and Phase 2 work. Nothing is staged. No commit, push, merge, reset, branch switch, or deployment was performed. The original `fursadhub` checkout and its existing frontend were not edited.

Reviewed the Phase 0 discovery, route inventory, security audit, and Phase 1 report before implementation. The Phase 1 checkpoint hashes are in [phase1-checkpoint.json](astra-phase2/phase1-checkpoint.json). All 24 tracked Phase 1 files remain: 23 are byte-for-byte unchanged; `index.css` retains its foundation and adds public presentation rules. Claude's working application remains the underlying implementation. [Complete working-tree inventory](astra-phase2/working-tree.txt).

## Routes and composition

- `/`: new text/photo hero composition, full-width functional discovery form, real recent internships before trust content, editorial trust layout, three audience panels, lifecycle, real moderated testimonials, and framed closing invitation.
- `/about`: restrained navy hero, existing skyline art, clearer section rhythm and audience panels. Existing product claims remain.
- `/opportunities`, `/organizations`, `/universities`: consistent title bands, search surfaces, wrapped institution labels and cards. Search, filtering, sorting, query parameters and pagination remain intact.
- `/opportunities/:id`: explicit section navigation, readable article surface, reserved cover geometry and sticky application rail. Existing save, apply, eligibility and sign-in behavior remain intact.
- `/organizations/:id`, `/universities/:id`: shared prominent cover and identity composition, matching skeleton, wrapped name/metadata/actions, existing facts, descriptions and links.
- `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`: shared editorial authentication shell, bounded approved photograph, route-specific copy, responsive form column. Form validation, OTP length, requests and authentication behavior were not changed.
- `/legal/terms`, `/legal/privacy-policy`, `/legal/cookie-policy`: framed readable document body and sticky related-document navigation. Published legal wording, versions and retrieval are unchanged.
- Public header/footer: two-row desktop navigation, active-route marker, original responsive native-dialog navigation, theme/language/account controls, reorganized footer columns and small skyline motif. No invented contact route or contact details.

## Shared presentation

New `PublicProfileHeader` and `PublicProfileSkeleton` compose existing Avatar, VerifiedBadge, ProfileBanner and Skeleton. `ProfileBanner` preserves its compact default for portal consumers and adds the public variant, accessible image labels, source-specific failure recovery and a touch-sized full-image link.

Shared public styles add cover aspect ratios (3:1 desktop, 2:1 mobile), a responsive section-spacing token, discovery surfaces, directory title rules, audience accents, public card wrapping and anchor offsets. Phase 1 colors, typography, theme initialization and motion preferences remain unchanged. EntityCard and InternshipCard gain public styling hooks; TestimonialWall gains shrinking/wrapping safeguards for narrow screens. No dependencies were added.

## Organization and university covers

Both institution types now use the same reserved cover geometry. At 1440px the measured cover is approximately 1214 x 405px, compared with the former shallow 160px band. At 375px it is 326 x 163px. Only the framed logo overlaps the image; names, verification, descriptions and actions stay below it in normal flow.

Uploaded media remains authoritative. Images use centered `object-fit: cover`, with a link to inspect the complete original image. Logos retain their contained rendering. There is no invented focal-point, crop, upload or delete API. Missing/failed covers use geometric navy artwork, and absent logos use the existing initials fallback. New source URLs recover after an image failure. Matching skeletons reserve the cover and identity dimensions.

Real Hormuud Telecom and Jamhuriya University profiles were inspected. Every available public institution had both images, so absence/failure/long-name checks used the explicitly labeled development-only `phase2.html` specimen. It creates no backend records and is not mounted in the production router.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | Pass, exit 0 |
| Configured lint | Pass, exit 0; 82 existing warnings. This repository uses Oxlint, not ESLint. No lint dependency or rules were changed. |
| Full frontend suite | 129 files, 1,169 tests passed; 0 failed |
| Production build | Pass, 582 modules; no new dependency |
| Existing public browser suite | 28 passed, 0 failed, 0 skipped in the final public-only run |
| Git whitespace check | Pass |

Logs: [typecheck](astra-phase2/typecheck.txt), [lint](astra-phase2/lint.txt), [build](astra-phase2/build.txt), [unit JSON](astra-phase2/unit-results.json), [browser JSON](astra-phase2/e2e-results.json).

The first full test run exposed the removed auth-panel heading and source-based profile assertions. The heading was restored; the profile assertion now follows the extracted component and additionally verifies that it contains the cover and no Reveal wrapper. No assertion was removed or weakened. Five new tests cover media combinations and failed-source recovery.

Browser tests caught 3px of testimonial overflow at 320px and the section strip's missing scroll affordance; both were fixed and the complete public selection passed again. An initial broad filename match also selected 43 existing authenticated tests, which skipped because no QA account manifest exists. Those were outside the final public-only selection; no tests were disabled.

## Responsive, localization and accessibility findings

Existing public tests cover home, About, internships, institution directories, login and registration at 320, 360, 390, 430, 768, 1024, 1440 and 1920px. Opportunity detail also passes at 375px. Those tests temporarily remove horizontal clipping to detect actual overflow, not just hidden content.

The shared public identity was additionally measured at all requested widths: 320, 375, 430, 768, 1024, 1440 and 1920px. Page width stayed within the viewport and the long real university name fit at every width. [Measured dimensions](astra-phase2/profile-widths.json).

Manual rendered checks included light/dark home, real organization/university profiles, cover-only/logo-only/neither/failed media, long names/descriptions, discovery cards, opportunity details, auth entry, About and legal content. English and Somali navigation, home, profile labels and About were inspected; Somali labels wrap without overlap. Real institution names and user content remain in their original language. Default-theme selection and persisted preference logic were untouched.

Existing semantic tests passed for public pages, auth and 404. Reduced-motion tests passed. The mobile dialog focuses Close, Escape dismisses it and returns focus to Open menu. Cover links retain a focus ring and minimum 44px height. Anchored detail links resolve to real sections, and Back restores listing scroll. This is targeted accessibility verification, not a complete assistive-technology certification.

## Visual evidence

Screenshots are in [astra-phase2/screenshots](astra-phase2/screenshots). These are rendered browser captures, not mockups.

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Home / navigation | [Light](astra-phase2/screenshots/home-desktop.png), [dark](astra-phase2/screenshots/home-desktop-dark.png), [Somali dark](astra-phase2/screenshots/home-somali-dark.png) | [Home](astra-phase2/screenshots/home-mobile.png), [menu](astra-phase2/screenshots/navigation-mobile.png) |
| Organization with cover | [Dark](astra-phase2/screenshots/organization-desktop-dark.png) | [Light](astra-phase2/screenshots/organization-mobile.png) |
| Organization without cover, QA specimen | [Dark, no images](astra-phase2/screenshots/organization-no-cover-desktop-dark.png) | [Logo only](astra-phase2/screenshots/organization-no-cover-mobile.png) |
| University with cover | [Light](astra-phase2/screenshots/university-desktop.png) | [English](astra-phase2/screenshots/university-mobile.png), [Somali](astra-phase2/screenshots/university-mobile-somali.png) |
| University without cover, QA specimen | [Dark](astra-phase2/screenshots/university-no-cover-desktop-dark.png) | [Long name](astra-phase2/screenshots/university-no-cover-mobile-long.png) |
| Internships | [Listing](astra-phase2/screenshots/listings-desktop.png), [detail](astra-phase2/screenshots/detail-desktop.png) | [Listing](astra-phase2/screenshots/listings-mobile.png), [detail](astra-phase2/screenshots/detail-mobile.png) |
| Auth | [Login](astra-phase2/screenshots/login-desktop.png) | [Login](astra-phase2/screenshots/login-mobile.png) |
| About / long-form / footer | [About](astra-phase2/screenshots/about-desktop.png), [legal](astra-phase2/screenshots/legal-desktop.png), [footer](astra-phase2/screenshots/footer-desktop.png) | [Somali About](astra-phase2/screenshots/about-mobile.png), [legal](astra-phase2/screenshots/legal-mobile.png), [footer](astra-phase2/screenshots/footer-mobile.png) |

Additional specimens: [failed cover](astra-phase2/screenshots/failed-cover-dark.png), [cover without logo](astra-phase2/screenshots/cover-only-desktop-dark.png).

## Boundaries and remaining limitations

No backend, database, API adapter, API contract, routing, business logic, RBAC, permissions, authentication flow or legal body changes. Existing upload permissions and handlers remain untouched. No security fixes were implemented; the separate [read-only RBAC/security audit](fursadhub-rbac-security-audit.md) remains open with its previously documented limitations.

The dedicated preview uses a local-only Vite configuration at 127.0.0.1:5175. Its proxy permits only public GET/HEAD requests, strips credentials and origin on those requests, and targets the existing localhost:8080 backend. This is a development QA setup, not a production CORS or authentication change. Authenticated workflows were not exercised end-to-end because no dedicated test-account manifest was available. Their unit coverage passed; no production accounts were created or modified.

Hormuud's source cover is only 407 x 149px, so it is visibly soft when enlarged. Mobile cover cropping is intentional; the complete original is available through the cover link. Higher-resolution owner uploads and future focal-point metadata are separate work. Some real API summaries are already truncated; presentation preserves the supplied content. The existing 82 lint warnings remain. No known unresolved presentation regression was found in the tested public routes.

## Phase 3 recommendation

Begin with the student portal shell, dashboard and discover-to-application journey using this foundation, after a dedicated authenticated QA environment/account manifest is available. Preserve eligibility, enrollment, nomination, placement and permission rules. Resolve the security audit through a separate authorized workstream. Phase 3 has not started.

## Phase 2 file inventory

Changed tracked files (Phase 1-only files excluded):

- `apps/web/src/app/layouts/AuthLayout.tsx`
- `apps/web/src/app/layouts/PublicFooter.tsx`
- `apps/web/src/app/layouts/PublicHeader.tsx`
- `apps/web/src/app/pages/AboutPage.tsx`
- `apps/web/src/app/pages/HomeHeroIllustration.tsx`
- `apps/web/src/app/pages/HomePage.tsx`
- `apps/web/src/components/ui/EntityCard.tsx`
- `apps/web/src/components/ui/InternshipCard.tsx`
- `apps/web/src/components/ui/ProfileBanner.tsx`
- `apps/web/src/features/auth/components/AuthShell.tsx`
- `apps/web/src/features/legal/pages/LegalDocumentPage.tsx`
- `apps/web/src/features/opportunities/pages/PublicOpportunityDetailPage.tsx`
- `apps/web/src/features/opportunities/pages/PublicOpportunityListPage.tsx`
- `apps/web/src/features/organization/pages/PublicOrganizationListPage.tsx`
- `apps/web/src/features/organization/pages/PublicOrganizationProfilePage.tsx`
- `apps/web/src/features/testimonials/components/TestimonialWall.tsx`
- `apps/web/src/features/university/pages/PublicUniversitiesPage.tsx`
- `apps/web/src/features/university/pages/PublicUniversityProfilePage.tsx`
- `apps/web/src/index.css`
- `apps/web/src/locales/en/common.json`
- `apps/web/src/locales/so/common.json`
- `apps/web/tests/features/opportunities/DetailReveal.test.ts`

New code/test/QA files:

- `apps/web/src/components/ui/PublicProfileHeader.tsx`
- `apps/web/tests/components/PublicProfileHeader.test.tsx`
- `apps/web/src/dev/Phase2Preview.tsx`
- `apps/web/phase2.html`
- `apps/web/vite.astra-preview.config.ts`
- `e2e/playwright.astra.config.ts`

Reports and evidence: `docs/audits/astra-phase2-report.md` and `docs/audits/astra-phase2/`.
