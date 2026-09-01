# Phase 8 — Self-Registration Only, Identity & Trust, Dashboard Polish

Tracking doc for the work requested after Phase 7.5 landed. Written before implementation starts,
per instruction — priorities are sequenced below and this file is kept current as each lands.

Status legend: `TODO` · `IN PROGRESS` · `DONE` · `BLOCKED`

**The flow is not changing.** Registration steps, the verification state machine
(`DRAFT → SUBMITTED → UNDER_REVIEW → VERIFIED/...`), and existing endpoints stay exactly as built
in Phase 7.5. Everything below is additive (new capability, new UI) or subtractive in one place
only (removing the seed) — nothing here restructures how registration or verification works.

---

## Priority 0 — License upload 500 error — DONE, confirmed

Root cause (found and fixed while Track A/B were still running): the shared groundwork added two
new classifications to the `FileClassification` enum but never extended the matching
`ck_stored_files_classification` CHECK constraint in `V38__institution_verification_evidence.sql`.
Every license upload — organization or university — was rejected at the database with an unhandled
`ConstraintViolationException`, surfacing to the client as an opaque `500 INTERNAL_ERROR`.

**Confirmed fixed**, not just fixed-by-reading: re-ran the exact tests against a real, fresh
Testcontainers PostgreSQL database — `OrganizationVerificationEvidenceIT` (11) and
`UniversitySelfRegistrationIT` (9), **20/20 passing, 0 failures**. The specific error code the bug
produced (`INTERNAL_ERROR`) also rules out a storage/MinIO explanation — that path fails with a
distinct `FILE_STORAGE_UNAVAILABLE` code instead, so this was the only cause.

**If you still see the 500 locally**: your dev database most likely applied the old (3-value)
version of V38 before this fix landed, and Flyway won't silently re-run an already-applied
migration. Reset the local Postgres volume (`docker compose down -v` under `infra/`, then back up)
so it re-migrates from scratch, or drop just the `stored_files` table's constraint manually. No
code or migration changes were made beyond the ones already confirmed above — nothing else was
touched, per instruction.

---

## Priority 1 — No seeded university; every institution self-registers

### What this actually requires (found during sizing, before writing any code)

The ask is simple to state but has one real dependency: **departments are currently seed-only.**
`Department.java` has no factory method, no writer, and its own javadoc says "seeded alongside its
university for the pilot." A self-registered university with no way to create a department can't
scope coordinators, can't enroll students into anything, and can't function — so department
self-management has to be built as part of this, not as a separate future item.

The seeded row is also a live test fixture: `AbstractPhase3IT` and `AbstractPhase4IT` (and several
individual test files) hardcode `JAMHURIYA_UNIVERSITY_ID` / `CS_DEPARTMENT_ID` as constants and use
them across ~9 files in candidacy, opportunity, and placement tests. Removing the seed means those
fixtures have to create their own verified university + department instead.

| Item | Status | Notes |
| --- | --- | --- |
| `Department`: add `register()`/create factory + `updateName()` + `DepartmentRepository.save()` | DONE | Mirrors the `University`/`Organization` writer pattern |
| `CreateDepartmentService`, `UNIVERSITY_ADMIN`-only | DONE | `POST /api/v1/universities/{id}/departments`; enforces `uk_departments_university_code` in Java before the insert |
| `UpdateDepartmentService`, `UNIVERSITY_ADMIN` or the assigned `DEPARTMENT_COORDINATOR` | DONE | `PATCH /api/v1/universities/{id}/departments/{departmentId}` — renames only; the department code is stable identity, same as an organization's slug |
| Frontend: department creation + inline rename on `DepartmentsPage.tsx` | DONE | Create form gated to `UNIVERSITY_ADMIN`; rename control gated to admin or a coordinator scoped to that specific department |
| Flyway `V39__remove_seeded_university.sql` | DONE | `DELETE FROM universities WHERE id = '...'` — departments cascade from the FK (V9). Confirmed applying cleanly: `mvnw verify` migrated to v39 and ran the full suite against it |
| Test fixtures: replace hardcoded `JAMHURIYA_UNIVERSITY_ID`/`CS_DEPARTMENT_ID` with a real self-registered + verified university created in test setup | DONE | Only 4 files actually depended on the seed (`AbstractPhase3IT`, `OpportunityTargetIT`, `PublicOpportunityDiscoveryIT`, `UniversityVerificationAuthorizationIT`) — the candidacy/placement tests already built their own fixtures via the existing `insertVerifiedUniversity` helper and needed no change |
| `OpenApiConfig.java` description ("pilot: Jamhuriya University") | DONE | |
| Landing page trust line ("Piloting with Jamhuriya University...") | DONE | Replaced in both EN/SO |
| **Full backend suite re-run after all of the above** | DONE | `mvnw verify`: **403/403 tests, 0 failures, 0 errors**, migrated cleanly through v39 |

---

## Priority 2 — Terms & conditions at registration

**Already done** in the prior session — not re-listed as new work. Required checkbox on
`RegisterPage.tsx`, sourced from the public legal-documents endpoint, submitted through the real
authenticated `POST /me/terms-acceptances` right after first sign-in. Will be covered by the full
test pass in Priority 5, not rebuilt.

---

## Priority 3 — Profile picture for every user

| Item | Status | Notes |
| --- | --- | --- |
| `FileClassification.PROFILE_PICTURE` + `RetentionCategory.ACCOUNT_ASSET` | DONE | JPEG/PNG, 3MB cap. Both `stored_files` CHECK constraints extended together this time (V40) — see the V38 finding above |
| `User.avatarStoredFileId`/`avatarUploadedAt` + migration | DONE | Account-level, one avatar per person regardless of role |
| `AvatarService` (upload self-service; view = any authenticated caller, no ownership check) | DONE | Deliberately NOT private like evidence documents — an avatar is identity shown to others, not proof kept secret |
| `POST /api/v1/me/avatar`, `GET /api/v1/users/{userId}/avatar/document` | DONE | |
| Frontend `Avatar` shared UI component | DONE | Handles both modes: a resolved blob `src` (personal avatars, need auth) or a direct public URL (org/university logos) — falls back to initials on load failure |
| `AccountProfilePage` (upload UI) wired into the role-neutral `/account` area | DONE | New `account` i18n namespace |

**Design note beyond the original plan**: "let organizations and universities build their brand" needs a *logo* distinct from a personal avatar — a public, unauthenticated asset, unlike every other file in FursadHub. Built as `Organization.logoStoredFileId`/`University.logoStoredFileId` (separate from the `User` avatar), reachable through new `/api/v1/public/organizations/{id}/logo/document` and `.../universities/{id}/logo/document` routes with no auth check and a 1-hour cache header.

---

## Priority 4 — Verified badge for organizations/universities (public trust signal)

The verified state already shows on an organization's/university's **own** profile page
(`AnimatedCheck` + `StatusBadge`). What's missing is a **public-facing** page other people —
students browsing opportunities, other organizations — can see, so verification actually functions
as a trust signal rather than a private status only the org/university itself sees.

| Item | Status | Notes |
| --- | --- | --- |
| Public organization profile page (unauthenticated) | DONE | `/organizations/:organizationId` — name, logo, verified badge, description, website, link to its opportunities. Linked from both the public opportunity list and detail pages |
| Public university profile page (unauthenticated) | DONE | `/universities/:universityId`, exact counterpart |
| `VerifiedBadge` shared component | DONE | New — composes the existing `StatusBadge` with one consistent check icon + label, used on opportunity cards, opportunity detail, and both public profile pages. One component so the trust signal never diverges by feature |
| `OrganizationSummaryResponse` gains `verified` | DONE | So the badge shows directly on an opportunity card, not only after clicking through |

---

## Priority 5 — Full test run (after Priorities 1–4 land)

| Check | Status | Notes |
| --- | --- | --- |
| `mvnw verify` (unit + `*IT`, Testcontainers) — first full run after Priorities 1–4 | DONE, 1 failure found and fixed | 403 tests, 1 failure: `PublicOpportunityDiscoveryIT.publicResponseNeverExposesPrivateOrganizationFields` asserts the exact field set of the public organization summary (a deliberate anti-data-leak test). Adding `verified` to `OrganizationSummaryResponse` for the badge broke it — correctly, since that's exactly what the test is for. Fixed by adding `verified` to the test's expected allowlist (it's an intentional field, not a leak) — re-ran that class alone, 8/8 passing |
| `mvnw verify` — second full run, after the test fix | DONE | **403/403 passing, 0 failures, 0 errors, BUILD SUCCESS** |
| `npm run typecheck` / `lint` / `build` | DONE | All clean — 2 unused-import errors caught by typecheck and fixed along the way |
| Browser walkthrough of the affected flows | DONE, 1 real bug found and fixed | Register → verify email → role-redirect → setup → evidence upload → submit-for-verification walked through end to end for both Organization and University. Organization worked first try. University's own profile page 500'd: `UniversityController` had no `GET /{universityId}` at all — `UniversityQueryService.getUniversity()`/`UniversityDetailResponse` existed but nothing routed to them. This is exactly the kind of gap 403 passing tests didn't catch, because no existing test called that route directly (state was checked via JDBC instead). Fixed with `UniversityQueryService.getForMember()` (membership-gated, same pattern as the organization side) + the missing `@GetMapping`, then closed the coverage gap with 3 new regression tests in `UniversitySelfRegistrationIT` (`managementDetailIsMemberOnly`, `departmentCreationIsAdminOnlyAndCodeIsUnique`, `departmentRenameIsScopedToTheAssignedCoordinator` — 12/12 passing, up from 9) |
| `mvnw verify` — third full run, after the missing-endpoint fix + new regression tests | DONE | **406/406 tests, 0 failures, 0 errors, BUILD SUCCESS** (up from 403 — the 3 new regression tests closing the gap that let the missing-endpoint bug through) |

---

## Priority 6 — UI/UX pass: engaging, smooth, better dashboard style

Deliberately last: this covers the *whole* app shell, and Priorities 3–4 add new surfaces
(avatars, verified badges, public profiles) that should be designed once as part of the same pass
rather than redesigned twice. Will follow the `frontend-design` skill's process (subject-ground,
plan color/type/layout deliberately, critique before building) applied to the existing
Student/University/Organization/Admin dashboards, which today are functional but plain (flat
`NavLink` bars, no at-a-glance dashboard cards per `BRAND_AND_UI_GUIDELINES.md` §7's "prioritize
workflow and next action").

| Item | Status | Notes |
| --- | --- | --- |
| Student dashboard (`/student`, new index route) | DONE | New `DashboardActionCard` composing existing enrollment/candidacy/nomination/offer/placement queries — no new backend, manually verified rendering real data in-browser |
| University dashboard (`/university`, new index route) | DONE | Same card pattern — verification queue, target requests, nominations, placements. Manually verified |
| Organization dashboard (`/organization`, new index route) | DONE | Same card pattern — published/draft opportunity split, placements. Deliberately does **not** add an org-wide candidate-pipeline tile — no aggregate endpoint exists for that yet, and building one wasn't part of the requested scope, so it's left out rather than faked with a per-opportunity loop |
| Consistent motion/visual language across the three new dashboards | DONE | All three share `DashboardActionCard`, using the same hover/lift treatment already established on the landing page's door cards — one motion language, not three |
| Admin dashboard | VERIFIED WORKING | Not redesigned (out of this pass's scope), but now manually confirmed end-to-end: Dashboard, Organizations, Universities, Escalations all render real data correctly. Used the existing `PlatformAdminBootstrap` mechanism (see below) to sign in as a real local `SUPER_ADMIN` rather than hacking the database directly |
| Broader visual pass (typography/spacing/motion across *existing* pages beyond the three new dashboards) | DONE — see Priority 7 | Was flagged as not started; completed in a follow-up pass below |

---

## Priority 7 — App-shell UI pass: navbars, page headers, empty states

Requested as a follow-up once Priority 6 was flagged incomplete: "complete the ui, navbars, hero
sections and everything... smooth, engaging and friendly." Read the `frontend-design` skill
(`frontend-design` plugin) again for this — since the brand brief (palette, type, motion tokens)
is already locked in `tokens.css` from the landing-page pass, this round applies the skill's
"ground it in the subject" and "spend boldness in one place" principles to the *existing* system
rather than inventing a new one: no new colors, no new typeface, one small quiet signature (a 3px
brand-orange rule at the top of every authenticated screen, echoing the door/path motif the
landing page already spends boldly) carried consistently everywhere instead of introduced once and
forgotten.

**New shared primitives** (`apps/web/src/components/ui/`), all four named directly in
`BRAND_AND_UI_GUIDELINES.md` section 4's expected-component list but not yet built:

- `Card` — the one bordered-surface container, generalizing the `rounded-lg border ... p-4` string
  that `DashboardActionCard` and the landing page's door cards each had inline.
- `PageHeader` — title/eyebrow/description/actions, replacing a bare `<h1>` on every feature page.
- `EmptyState` — icon + title + optional action, replacing a bare "No X match" line.
- `Menu` — a small accessible popover (outside-click, Escape, `role="menu"`), first used for the
  new account control in the header.

**`RoleShell` (the header every authenticated page shares) redesigned**: added the 3px accent bar;
replaced the bare "Account" / "Sign out" text links with a real `Avatar` (photo or initials,
reusing the Phase 8 avatar work — until now built but never actually shown anywhere in the app
shell) behind a `Menu`.

**`AreaTabs` extracted**: the second-level nav row (Dashboard / Enrollment / ... per area) was
copy-pasted with an identical `navLinkClasses` helper across five files —
`StudentAreaLayout`, `UniversityAreaLayout`, `OrganizationAreaLayout`, `AdminAreaLayout`, and
`AccountLayout`. Replaced all five with one shared `AreaTabs` component; each layout now just
passes its own `{ to, label, hidden? }` list. No conditional/authorization logic changed — the
`hidden` flag reproduces exactly the same `isAdmin`/`isSuperAdmin` checks that were already there.

**`PageHeader` rolled out** to every routed feature page with a page-level `<h1>` — 38 files across
Student, University, Organization, Admin (done directly), Recruitment, Opportunities, and
Placements, dispatched as five parallel background agents (each given a fixed, narrow file list and
the exact mechanical instruction: swap the `<h1>` for `<PageHeader title={...} />`, fold an
immediately-adjacent subtitle `<p>` into `description=` only when it unambiguously reads as a
whole-page subtitle, touch nothing else). One agent (university batch) found and fixed a real
pre-existing type gap while doing this:
`VerificationCaseDetailPage.tsx`'s `studentEmail: string | null` didn't satisfy `PageHeader`'s
`title: string` — the original `<h1>` silently rendered nothing for `null` since it accepted any
`ReactNode`; fixed with `?? ''` to preserve that exact display behavior.

**`EmptyState` rolled out** to the list pages with a real "nothing to show" state — done directly
(not delegated, since several needed restructuring a `<li>`-based empty row into a proper
conditional branch, which needs more judgment than the heading swap): `PrivacyPage`,
`DepartmentsPage`, `CandidatePoolPage`, `MyNominationsPage`, `OpportunityRequestsPage`,
`NominateStudentsPage`, `OpportunityListPage`, `PublicOpportunityListPage`, and both `StaffPage`s
(university + organization) — plus all 9 Admin review pages already done as part of this same pass.
A few low-traffic nested lists (the target sub-list inside `OpportunityDetailPage`, the screening-
question editor's empty row) were left as plain text — genuinely low value for the risk of touching
more conditional logic.

**Verification**: `npx tsc -b --noEmit`, `oxlint`, and `vite build` all clean after every batch and
again after the final `EmptyState` pass (BUILD SUCCESS, no new warnings). Manually walked the
result in-browser: signed in as `SUPER_ADMIN` (Admin console — accent bar, avatar menu, dashboard,
organizations/universities list with the new empty state) and as three fresh test accounts
(Student dashboard + the folded-subtitle enrollment claim form; Organization and University setup
pages with their folded title+description) and the public opportunity list (header, empty state,
and the Priority-1 footer links all rendering together). Every area matched the design intent with
no regressions.

**Not touched in this pass**: the Admin console's own visual style (left as-is, already reasonably
clean); Weekly Logs / Attendance / Evaluation / Defense / Final Report, which use `<h2>` *section*
headings inside a composed placement-detail page rather than a page-level `<h1>`, so they were
correctly left alone rather than mismatched into `PageHeader`.

---

## Findings (Priority 6 work)

### V39's plain DELETE would have crashed startup on any database with real usage (found and fixed)

The original `V39__remove_seeded_university.sql` was `DELETE FROM universities WHERE id = '...'`,
which only works when nothing references that row — true in a fresh Testcontainers database
(where every earlier test run's IT suite creates its *own* university), but the user's persistent
local dev database had actually used the seeded university for one recorded `opportunity_targets`
row. Checked before touching anything: `student_enrollments`, `opportunity_targets`,
`nominations`, `candidacies`, and `placements` all hold a **direct, non-cascading** foreign key to
`universities(id)` — everything beneath those five cascades fine, but Postgres refuses the
`DELETE` itself while any of the five still has a row pointing at it. Left as-is, this would have
thrown a foreign-key-violation on Flyway migration the next time the backend started against a
database that had ever used the seeded tenant — not a test failure, a startup crash.

Fixed by explicitly clearing `opportunity_targets`, `candidacies`, and `student_enrollments`
(scoped to the seeded id) before the final `DELETE FROM universities` — `nominations` and
`placements` aren't listed separately because they cascade away as a side effect of those three,
via their own FKs. Re-verified against the user's actual local dev database's foreign key graph
(`pg_constraint`), not assumed. On that specific database the real blast radius is one test
`opportunity_targets` row (and whatever nominations it cascades) — `student_enrollments` and
`candidacies` were already empty there.

**Consequence for you**: the next time the API starts against your local dev Postgres, Flyway will
run V39 and V40 and this cleanup will happen automatically. If you'd created any candidacies,
placements, or student enrollments against the seeded Jamhuriya University in your local testing,
they will be deleted as part of removing the seed — by design, not as a side effect you weren't
told about. Nothing has run against your database yet; this is what will happen the next time you
start the backend.

## Landing page footer (small follow-up)

The plan's landing-page section called for footer Terms/Privacy/Cookie links; the hero, door
cards, how-it-works band and trust line were already built, but `PublicLayout.tsx`'s footer only
had the logo and tagline. Added the three links (`/legal/terms`, `/legal/privacy-policy`,
`/legal/cookie-policy`), reusing the existing `legal:documentTypes.*` translations so there's no
new duplicated copy. One new key added to `common.json` (en/so): `footer.legalNav` (the nav's
accessible label). Confirmed rendering and linking correctly in-browser; `lint`/`typecheck`/`build`
all clean.

## Local SUPER_ADMIN (development only)

No code was changed for this — `PlatformAdminBootstrap` already existed
(`apps/api/.../administration/application/PlatformAdminBootstrap.java`), built during Phase 7 and
never used locally until now. It grants the very first `SUPER_ADMIN` from a configured email,
exactly once, and only if the named account already exists and no active platform grant exists yet
— it can't create an account and can't re-grant authority later, so it's safe to leave the
mechanism itself untouched.

Used it as designed: registered `admin@fursadhub.local` through the normal `/auth/register` +
email-code flow (no manual password hashing), then restarted the API with
`BOOTSTRAP_SUPER_ADMIN_EMAIL=admin@fursadhub.local` set, which granted the role on startup. Signed
in and confirmed the full admin console (Dashboard, Organizations, Universities, Escalations) works
against real local data. This local credential is not committed anywhere — it exists only in this
machine's dev database.

## Explicit non-goals

- No change to the registration or verification **flow** (steps, states, endpoints) — only
  additive capability (departments, avatars, public pages) and visual polish.
- No re-litigating the Priority 0 fix — it's confirmed by a real test run, not just code review.
