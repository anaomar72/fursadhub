# FursadHub Astra — discovery and continuation

Date: 2026-10-11 (Africa/Nairobi). Baseline: `4b7b9ab4a8171b6fb3b3aa7cc9e1cb4b56899786`.
Branch: `feat/astra-premium-ui-redesign`. Checkout: `C:/Users/hp/Documents/fursadhub-astra`.

## Scope and status

This is the Phase 0 discovery checkpoint, not delivery of the transformation. No application source, backend, API contract, permission, route, theme initialization, or lifecycle behavior has been changed. Phases 1–8 remain. The current user brief supersedes legacy visual-authority statements in source comments and CLAUDE.md; preserve the actual brand mark and behavior, not the previous mockups' compositions.

## Git preservation

Astra starts from the latest 13-commit modernization series beyond main. The original branch and its live remote matched at 4b7b9ab during the preceding safety inspection. The original checkout retains its local API IDE configuration, Claude settings, presentation proofs, environment files and generated outputs. The older divergent Claude design remains at local-only backup/claude-ui-redesign (c064b44); it is not part of Astra ancestry. Do not merge that alternative wholesale. No automatic commit, push, merge or deployment is authorized.

## Architecture and invariants

- React 19, TypeScript, Vite 8, Tailwind 4 using the Vite plugin and CSS @theme mappings; no separate Tailwind config.
- Router: apps/web/src/app/router/index.tsx. Seven lazy area barrels separate account, administration, authentication, internship, organization, student and university features. Public pages are eager imports. Preserve deep links and capability wrappers.
- Source AST inventory: [102 route records](astra-route-inventory.md), including parent layouts and index redirects. [JSON](astra-baseline/routes.json) includes inherited element/guard chains; this is not 102 unique screen components.
- Data: TanStack Query, feature-local API adapters, shared apiFetch, React Hook Form and Zod. Keep query keys, mutations, invalidation, payloads, validation and status derivation unchanged.
- PublicLayout owns shared header/footer; AuthLayout owns split-screen entry; AppShell/RoleShell own workspace navigation. AccountLayout preserves the signed-in user's portal. Do not simplify role-aware shell resolution into fixed navigation.
- Tokens live in src/lib/design-system/tokens.css; Tailwind mapping, role typography, animations and workspace density live in src/index.css. cn() knows custom typography utilities; preserve its merge behavior.
- Brand: existing navy/white WebP marks, navy #0B2A5B and orange #F97316. Existing primary action fill #C2410C distinguishes readable white button labels from brand orange. Retain the mark and avoid unmeasured color substitutions.
- Theme invariant: saved light/dark preference wins, otherwise OS preference, light only as fallback. Preserve fursadhub-theme and data-theme (src/lib/theme/theme.ts).
- English and Somali namespaces already exist. New copy needs both languages and review; do not hardcode English or fabricate translations as approved.
- Managed staff, nominations, internship status, verification and platform grants remain outside redesign logic scope.

## Reuse, redesign and replacement decisions

| System | Decision | Reason / boundary |
|---|---|---|
| Button, ButtonLink, controlClasses, FormField | Restyle existing APIs | Preserve disabled/pending behavior, labels and validation associations |
| Modal, Drawer, Menu, Toast, RadioCard | Retain interaction behavior; audit appearance | Existing keyboard/focus and feedback behavior must survive |
| PageContainer, PublicContainer, PageHeader, Panel | Refine shared layout roles | Centralize width/rhythm rather than patch each route |
| DataTable, pagination, filters | Retain data behavior; improve density/actions | Keep intentional table scrolling and mobile renderers |
| StatusBadge/status maps, lifecycle/journey derivation | Retain semantics | Color and layout may change; status meaning may not |
| ProfileBanner and duplicated public identity rows | Replace presentation with reusable profile composition | Current cover height and identity composition are the highest-priority confirmed problem |
| Public marketing sections and footer | Recompose | Clearer product story and section hierarchy; actual API data only |
| Role-aware navigation and API adapters | Preserve | UI visibility is not server authorization |
| Institution verification and document upload | Restyle around existing controls | No new upload backend or crop persistence contract |

## Visual assessment by major route family

These are source-informed assessments unless explicitly labeled browser-observed. Authenticated screens have not been visually signed off.

| Routes / family | Assessment and planned treatment | Evidence / validation status |
|---|---|---|
| / | Existing split hero, multi-control search and repeated trust/journey sections compete for attention. Introduce a clearer entry hierarchy, editorial type and a single end-to-end journey story. Preserve real listings and editorial claims. | Browser before capture, light desktop/mobile; source HomePage |
| /about | Align narrative rhythm, audience sections and next actions with home. Avoid repeating the same card grid for every message. | Browser geometry; source route/shared public shell |
| /opportunities and /opportunities/:opportunityId | Preserve filters, query parameters and application gating; refine scan order, compensation/location metadata and persistent action hierarchy. | List geometry measured; loaded detail acceptance still required |
| /organizations and /universities | Make directory identity, search and result density coherent. Preserve published directory scope, real counts and filters. | Public organization directory loaded on existing port 5173 |
| Public institutional profiles | Desktop cover is only 160px high regardless of width; real Hormuud cover image measured 1214 x 158 at viewport 1440, ~7.7:1, visibly cutting through the wordmark. Replace fixed heights with responsive aspect-ratio roles. | Real uploaded asset observed on localhost:5173; source ProfileBanner.tsx:22 |
| Public profiles loading | University skeleton uses 4:1 but loaded banner uses h-28/sm:h-40. Match loading and loaded geometry to prevent avoidable shifts. | Source PublicUniversityProfilePage.tsx:42 and ProfileBanner |
| /login, /register, /verify-email, /forgot-password, /reset-password, /get-started | Preserve all forms and onboarding choices; refine the heavy half-screen image panel and form hierarchy. Login currently puts decorative h2 before form h1 in DOM; review semantic heading order. | Login/register rendered; other flows source-inventoried |
| /student/* | Maintain attention items, recruitment summary, placement timeline and readiness based on real records. Refine prioritization and reading density; do not introduce decorative totals. | Source DashboardPage, journey components; authenticated QA pending |
| /organization/* | Preserve recruiter/admin/supervisor differentiation. Focus on action queues, candidate board, opportunities, scoped placements, staff and profile. | Source workspace, capability and router inspection; authenticated QA pending |
| /university/* | Preserve departments, scoped nominations/verification and assigned supervision. Improve dense list/detail rhythm and long-label behavior. | Source workspace, router and scope inspection; authenticated QA pending |
| Placement child routes across roles | Keep weekly logs, attendance, evaluation, final report and defense audience differences exactly intact. Improve one shared workspace treatment. | Router inventory and backend authorization source |
| /admin/* | Keep existing real metrics, review actions and sensitive confirmations. Reuse dense table/detail primitives. Shared public profile identity is not currently used on admin institution detail pages. | Source admin dashboard/detail pages; authenticated QA pending |
| /account/* | Keep current portal rail while presenting secondary settings navigation. Standardize profile, notifications, privacy and testimonial states. | Source RoleShell and route inventory; authenticated QA pending |
| /legal/* and wildcard | Retain real legal document fetches and missing-document states. Align readable prose width and recovery actions. | Route/source inventory; loaded legal QA pending |

## Profile-image engineering findings

ProfileBanner uses object-cover correctly, but its 112/160px heights force extreme desktop cropping. It marks the entire banner aria-hidden. Decorative covers may remain decorative, but meaningful uploaded content needs an explicit labeling decision. The failed-image boolean is not reset when coverUrl changes: replacing a failed URL on the same mounted component leaves the fallback active. Public identities duplicate their overlap layout; portal profiles put the cover above a separate card. Introduce shared identity geometry with context-specific actions, not shared permission logic. Preserve cache-busting upload timestamps. The inspected cover upload flows contain no focal-point/crop controls; no backend crop API should be invented.

## Astra design direction for Phase 1

Direction: a professional opportunity network with a clear path from discovery to completion.

- Keep the FursadHub mark, navy and orange anchors. Use calm neutral reading surfaces; reserve strong brand treatment for identity and primary actions.
- Establish three layout modes: expressive public/editorial, spacious student workspace, compact institutional/administrative workspace. Share typography, controls and feedback, not identical page density.
- Public home: one confident product statement, a direct discovery action, real opportunities, an understandable application-to-completion narrative, and distinct entry points for universities/employers. Reduce repeated trust copy and repetitive boxed sections.
- Profiles: approximately 3:1 desktop and 2:1 mobile as initial hypotheses; validate against real uploaded assets before accepting. Separate logo overlap from name/action flow so long names remain legible. Reserve identical space during loading. Consider a frontend-only full-image viewer if meaningful banner content remains cropped; do not fabricate persistent crop controls.
- Type: keep installed fonts initially; assign display, page, section, label and metadata roles deliberately. Do not add a font/dependency until browser evidence justifies it.
- Use four surface levels and a restrained shape scale; stronger borders for controls than decorative separators. Measure both themes and focus contrast.
- Preserve efficient transform/opacity motion and reduced-motion handling. Avoid new animation dependencies.

## Verification baseline

Runtime: bundled Node 24.19.0. Shell Node 22.18.0 is below the installed jsdom/undici engine requirements. npm ci completed from the existing lockfile; no dependency edits.

- Typecheck: passed.
- Lint: exited successfully with pre-existing warnings in router lazy declarations, AuthContext, VerifyEmailPage and form-library usage. No warning suppression applied.
- Production build: passed; Vite transformation/build portion 4.58s (not total command duration). Main JS 298.82 kB / 81.03 kB gzip; shared UI 245.86 / 75.02; errorMessage shared chunk 218.66 / 59.72; CSS 83.32 / 15.22. These are build artifact sizes, not network performance or Lighthouse scores.
- Unit suite: see continuation/results below. Failures observed before any UI edits; do not weaken tests to hide them.
- Browser: 56 document-width measurements across /, /about, /opportunities, /organizations, /universities, /login, /register at 320, 375, 430, 768, 1024, 1280, 1440, 1920. No document scrollWidth excess in this pass. This does not prove absence of clipped descendants; existing e2e trueContentWidth removes clipping and should still be run.
- API health on localhost:8080: HTTP 200. Astra preview on 127.0.0.1:5175 has API failures; local backend configuration permits localhost:5173. Existing localhost:5173 public directory and uploaded organization cover load. Do not weaken CORS to enable preview.
- No QA manifest was configured. Existing browser at 5173 is signed out. User authorized using available resources; authenticated acceptance remains outstanding rather than inventing credentials.

## Continuation and phase gates

1. Finish baseline test diagnosis; distinguish reproducible assertions from host-load timeouts without changing timeout expectations as a workaround.
2. Use a local preview arrangement compatible with backend allowed origins, without touching the original checkout or weakening backend security. Preserve the original running server; explicitly plan separate service coordination before replacing anything.
3. Record remaining public detail/legal and role-specific before screens where test access exists. Screenshots are baseline evidence, not after images.
4. Implement Phase 1 tokens and primitives as a reviewable group; check contrast, themes, controls and translations.
5. Implement public composition and shared profile identity, validate real cover media at all target widths.
6. Continue student, organization, university, admin, account and cross-platform phases in that order. Keep audit findings out of UI authorization code.
7. Run full final checks and browser workflow acceptance. Do not claim production readiness without those results.

Security investigation: [RBAC audit](fursadhub-rbac-security-audit.md). Scope and evidence limitations are explicit there.

### Completed full-suite baseline

Command: `npm test -- --maxWorkers=2` using Node 24.19.0. Duration: 499.45s.
128 files: 125 passed, 3 failed. 1,162 tests: 1,158 passed, 4 failed.

- CandidateDetailPage.test.tsx:145 — response deadline validation test exceeded the unchanged 5,000ms timeout.
- CandidatePoolPage.test.tsx:93 — candidate pipeline list was not found within the query wait.
- University StaffIdentity.test.tsx:166 and :192 — staff display-name tests exceeded 5,000ms.

A focused single-worker retry of these three files is recorded in astra-baseline/unit-retry.json. No assertions, code or test timeouts were changed.

### Additional observed profile defect

At 375px, both organization and university names can overlap the cover. The public identity row applies -mt-10 to the entire logo/name composition; a multi-line institution name rises into the banner. Move overlap to the avatar alone and let the identity text flow below the cover. This is visible in the real Hormuud and Jamhuriya before captures. The university's cover loads asynchronously; ensure final screenshot is captured after the image is complete.

### Focused retry outcome and checkpoint

The three failed files passed with one worker: 29/29 tests, zero failures. Assertions and timeouts were unchanged. This suggests timing sensitivity in the loaded full-suite run; it does not erase the original failed run or establish a fully green full-suite baseline. See unit-retry.json for machine-readable results.

Stopping at the discovery boundary for this execution. No UI implementation phase is claimed complete. Remaining Phase 0 acceptance: authenticated role screenshots/workflows and deeper clipping/accessibility tests. Phases 1–8 remain. No new approval is needed for the already-authorized presentation work; commits/pushes/deployment remain prohibited without explicit approval.
