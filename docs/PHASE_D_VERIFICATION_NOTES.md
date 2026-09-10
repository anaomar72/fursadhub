# Phase D — Verification Notes

Records two items surfaced during Phase D verification that are **not** Phase D work and were
deliberately left unchanged. Neither blocks Phase D.

---

## 1. Design/functional deviation — backend does not support cover removal

**Status: accepted for Phase D.**

Backend Phase B2 added a public profile cover for both tenant types, but exposes only an
upload/replace route:

| Operation | Organization | University | Supported |
|---|---|---|---|
| view | `GET /api/v1/public/organizations/{id}/cover/document` | `GET /api/v1/public/universities/{id}/cover/document` | YES |
| upload | `POST /api/v1/organizations/{id}/cover` | `POST /api/v1/universities/{id}/cover` | YES |
| replace | same `POST` (overwrites) | same `POST` (overwrites) | YES |
| **remove** | — | — | **NO — no DELETE endpoint exists** |

Confirmed by inspection: `OrganizationController` and `UniversityController` declare no
`@DeleteMapping` at all, for the cover or for the logo.

**Phase D frontend behaviour is therefore view / upload / replace only.** No Remove control was
added, because a control with no endpoint behind it is worse than an absent one — it would fail
every time it was used. The empty state says a cover has not been uploaded; the populated state says
that uploading a new image replaces the current one.

If cover removal is wanted as a product capability, it needs a backend change (a `DELETE .../cover`
route plus the managed-file lifecycle to release the stored object) and is out of Phase D scope.

---

## 2. Authorization observation — recorded for a later audit, NOT fixed here

**Status: recorded only. Nothing was changed. This is not a dismissal — it needs a decision before
production review.**

### Observation

Four managed-staff lifecycle operations, in **both** tenant modules, authorize the CALLER as a
tenant admin and verify the target membership belongs to that tenant — but do **not** constrain the
target membership's CURRENT role. A tenant admin can therefore invoke them against another
`ORGANIZATION_ADMIN` / `UNIVERSITY_ADMIN` membership, including their own.

### Exact surface

**Organization** — `OrganizationMembershipController`
(`/api/v1/organizations/{organizationId}/members`) over
`OrganizationMembershipService`:

| Endpoint | Service method | Caller guard | Target-role guard |
|---|---|---|---|
| `POST /{membershipId}/suspend` | `suspend` (line ~142) | `requireMembership(..., ORGANIZATION_ADMIN)` | **none** |
| `POST /{membershipId}/reactivate` | `reactivate` (line ~164) | `requireMembership(..., ORGANIZATION_ADMIN)` | **none** |
| `POST /{membershipId}/reset-password` | `resetPassword` (line ~187) | `requireMembership(..., ORGANIZATION_ADMIN)` | **none** |
| `POST /{membershipId}/revoke` | `revoke` (line ~205) | `requireMembership(..., ORGANIZATION_ADMIN)` | **none** |
| `POST /{membershipId}/role` | `changeRole` (line ~123) | `requireMembership(..., ORGANIZATION_ADMIN)` | `requireAssignableRole(newRole)` — checks the **NEW** role, not the target's current one |

**University** — `UniversityStaffController`
(`/api/v1/universities/{universityId}/staff`) over `UniversityStaffService`:
the same five methods with the same guard shape (`suspend` ~line 165, `reactivate` ~189,
`resetPassword` ~214, `revoke` ~231, `changeRole` ~139).

### What IS correctly guarded

The two Backend Phase B5/B5.5 identity commands call `requireAssignableRole` on the membership's
**current** role, so a founder admin cannot be renamed or given a username through staff management:

- `POST /{membershipId}/display-name` → `changeDisplayName`
- `POST /{membershipId}/username` → `assignUsername`

### Consequences to assess in the audit

1. **Self-lockout.** An organization/university admin can suspend or revoke their own membership,
   leaving the tenant with no administrator and no in-product recovery path.
2. **Admin-on-admin action.** Where a tenant has several admins, any one can suspend, revoke or
   reset the credentials of another.
3. **Demotion via `changeRole`.** `requireAssignableRole(newRole)` permits
   `ORGANIZATION_ADMIN → RECRUITER`, since only the destination role is validated.

CLAUDE.md section 23 states that a tenant admin must not assign "their own parent admin role"; it
does not explicitly speak to acting on a peer admin's membership, so the intended rule needs to be
settled by the FursadHub team rather than assumed.

### Frontend position (unchanged in Phase D)

The two portals differ, and both are defensible given the backend permits these calls:

- **Organization** `StaffPage` hides role/suspend/reset/revoke on an `ORGANIZATION_ADMIN` row. This
  is the page's own conservatism, not a mirror of the server. A comment there previously asserted
  the backend refuses these calls; that assertion was inaccurate and has been corrected to describe
  what actually holds.
- **University** `StaffPage` shows them on a `UNIVERSITY_ADMIN` row. Truthful with respect to the
  backend, which accepts them.

Neither was altered during verification. Aligning the two portals should follow the backend decision,
not precede it.

---

## Phase C/D convergence follow-up — 2026-09-07 (Codex)

Continued the existing branch and working tree. Initial `git diff` and staged diff were empty;
Claude local settings and the September 7 asset sheet were already untracked and were preserved.
No backend production file, route guard, authentication implementation, permission model, or
Super Admin feature was changed. No commit was created.

### Presentation and navigation

- Refs 01–02: replaced the brand-placeholder hero with the approved student photograph from the
  September 7 presentation asset sheet. `HomeHeroIllustration` clips only the sheet's top-left
  photograph in CSS; sheet captions, example company imagery, and palette annotations are not
  rendered. The source copy is `apps/web/src/assets/brand/presentation-assets.png` (about 2 MB).
  This is decorative presentation imagery, never a user or tenant record. The canonical brand
  sheet remains the palette authority.
- Public footer spacing and typography are more compact; desktop navigation remains in normal
  layout flow to avoid collisions with account controls. Entity detail routes retain their
  directory's active navigation state.
- Ref 06: universities use six compact columns at desktop width, with wrapped names, real logos,
  backend verification, and full-width profile actions. Smaller widths use fewer columns.
  Corrected the stale English and Somali copy claiming no public directory API exists.
- Ref 07: recent applications lead the student dashboard, with internship discovery below and
  readiness/current placement in the side column. Existing five metrics and all destinations
  remain. No unsupported recommendations or activity records were invented.
- Refs 08–09: ruled metric-card footers, wrapping metric labels, a prominent existing new-internship
  action for organization admins, and a larger university tenant mark/name on the navy rail.
  Tenant names and logos still come from the resolved membership/profile.
- Signed-in public visitors see **My portal**, which resolves their existing console destination
  only when selected. Public routes remain public; there is no redirect on visiting the marketplace.
- Portal sidebars expose **Public marketplace** in expanded, collapsed and mobile layouts without
  signing out. Shared shell improvements also apply to existing account/admin shells; no Phase E
  feature or admin-specific file was implemented.

### Keyboard, forms and truthful loading states

Public and portal mobile navigation now use native modal dialogs, making background content inert.
Escape closes them and restores trigger focus; both include a close control. The public menu locks
background scrolling and can itself scroll. Public pages have a skip-to-content link.

`FormField` associates missing input IDs with labels, preserves existing descriptions, attaches
hint/error descriptions, and announces invalid fields. Fragments are excluded from prop cloning.

The home feed distinguishes loading, request errors and real empty results. Student and organization
primary dashboard requests show retryable errors instead of inventing zero-valued metrics when
requests fail. An unresolved saved-internship total displays an em dash.

### Verification and remaining limits

- Full frontend suite: **649 tests passed** with `--maxWorkers=2`. The initial default-worker run
  was overloaded and had timeout failures; the bounded rerun passed without increasing timeouts.
- Follow-up regression set after the presentation/error-state refinements: **44 tests passed**.
- Production build passed. Lint exits successfully; its six remaining warnings are in unchanged
  files. Vite still reports the existing large JavaScript chunk warning.
- Browser inspection at 1448px and 390px: approved photo displays without sheet captions, hero
  controls remain usable, mobile navigation exposes only modal content, and Escape restores focus.
  Inspected the mobile university directory shell as well.
- The local preview could not load its backend data. Populated real-data public cards, tenant
  dashboards, and end-to-end signed-in journeys therefore still need live verification with a
  running backend/session. No demo records were added to make these screenshots look populated.
- Existing cover-removal and staff-authorization observations above remain unchanged.
- Final checks after the organization request-error guard and marketplace-link regression:
  **16 tests passed**, production build passed, and `git diff --check` passed. Backend diff is empty.
# C/D remediation review — 2026-09-07

This review supersedes earlier presentation-completion claims below. **Exact convergence is not accepted and Phase E remains stopped.** No backend production files or admin feature files were edited, and no commit was made.

Visual proof: [side-by-side review](presentation-proof/comparison.html), [capture manifest](presentation-proof/manifest.json). The six public routes were loaded from `http://localhost:5173` using the existing backend. At capture time the backend contained 5 published internships, 3 organizations and 2 universities. These include test-like names stored in the backend; they are not frontend fixtures. The approved hero, skyline and CTA assets were copied from the canonical reference set. No reference tenants, users, metrics, statuses or testimonials were copied into production.

Implemented in this continuation:

- Public hero photography, denser home sections, footer columns and skyline, truthful customer-story pending state, internship support rail and CTA.
- Real bookmark controls on public home/list/detail, authenticated account avatar and notifications in public navigation, and portal/public navigation retained.
- Public internship detail with actual uploaded organization cover, compensation, hours, skills, perks, facts, section navigation and copy-link control.
- Organization profile with overlapping identity, supplied social links, real size/founding fields, main-column quick facts, latest openings and truthful guidance modules.
- University-specific narrow directory cards and public-directory counts; unsupported student-reach and university opportunity totals are not invented.
- Organization/university editors grouped into information, public profile, web and media sections. Create/edit opportunity fields grouped by purpose with sticky submit controls. Existing payload builders and PatchField behavior are retained.
- Form labels/errors associated with controls; controlled year/hours/tag fields pass refs and accessibility attributes. Tags remain focusable at capacity so Backspace can remove a value.
- Student dashboard: four main counters, profile panel, applications and three real opportunity tiles. University dashboard: nominations beside overview, lower partner-card strip. Organization dashboard: pipeline/overview beside quick actions/current interns. Existing data sources and role gates remain.

Validation:

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS; six existing warnings |
| `npm run test -- --maxWorkers=2` | 81 files / 651 tests PASS |
| Subsequent dashboard + public-shell regression checks | 23 tests PASS after the final dashboard and focus changes |
| `npm run build` | PASS; existing large-chunk warning remains |
| `git diff --check` | PASS |
| Logged-out public home/list/detail/directory routes | Loaded with real backend data; no horizontal overflow at 1448×1086 |
| Mobile home/universities at 390×844 | No horizontal overflow or clipped form controls observed |
| Mobile public navigation keyboard | Enter opens; Shift+Tab wraps to last item; Tab wraps to close; Escape closes and restores trigger focus |
| Authenticated public navigation / portal → public | Covered by frontend tests; live session check still pending |
| Student / Organization Admin / University Admin screenshots | Pending existing authenticated sessions |
| Profile and opportunity editor keyboard flows | Code improved; complete live authenticated flow remains pending |

Evidence limits and remaining work:

1. The browser DOM viewport was explicitly 1448×1086. Some exported screenshots are cropped/rescaled by the in-app panel; actual dimensions are recorded in the manifest. Full-page and explicit 1448×1086 clip captures were attempted and rejected by the browser tool. These are not represented as full reference-size proof.
2. Refs 01–06 have the main presentation elements but still differ in geometry and content density. For example, the home footer begins around y=997 rather than y=970, and the page is 1142px tall. The internship hero lacks the reference’s internal text panel; detail facts wrap; organization culture/customer-claim modules use honest generic guidance.
3. Sparse backend records produce fewer cards than the references. No records were duplicated to fill the grid. Unsupported metrics, charts, filters, newsletter/alert subscriptions and recommendations were not fabricated.
4. Existing Student, Organization Admin and University Admin sessions are required to finish refs 07–09, authenticated public-navigation checks, and keyboard/save/error review of profile and opportunity forms. No account creation, password reset or authorization bypass was performed.

**Acceptance gate: FAIL / incomplete. Safe to start Phase E: NO.**

---

# Pre-Phase-E gap closure — 2026-09-08 (Claude)

Continued the existing branch and working tree. Branch `feat/fursadhub-presentation-refresh`,
HEAD `d20d00b`, upstream `16fbbb2`. No reset, clean, checkout, restore or revert. No commit, push or
merge. No Phase E / Super Admin or Verification Officer presentation work.

## Audit outcome

Of the 33 requested items, 28 were already DONE in the inherited tree. Five were real gaps:

| # | Item | Prior state | Closed by |
| --- | --- | --- | --- |
| 11 | Recruiter CV view/download | PARTIAL | preview + `hasApplicationCv` wiring |
| 24 | About page | PARTIAL | rebuilt in the approved presentation language |
| 25 | Legal pages | PARTIAL | professional layout; wording untouched |
| 26 | Testimonials system | **MISSING** | new minimal moderated module |
| 27 | Home testimonial behaviour | PARTIAL | real published quotes, pending state retained |

One pre-existing test failure was found in the inherited tree and fixed (see below).

## Pre-existing test failure repaired

`tests/components/PublicShell.test.tsx > switches language and theme` failed on the inherited tree.

Cause: `ThemeToggle` had previously carried a **hardcoded English** `label`, which the earlier work
correctly internationalised (`common:theme.useDark` / `useLight`), satisfying CLAUDE.md section 56.
The test switched the shell to Somali and then still looked for the English accessible name.

The source was right and the expectation was stale, so the TEST was corrected — it now asserts the
Somali name after the language switch, which is a stronger assertion: it proves the control is
translated rather than merely present. No assertion was weakened or removed.

## Testimonials — new `testimonial` module

Built because the audit confirmed no testimonial system existed anywhere (backend, migrations or
frontend). Deliberately minimal.

**The security property, and how it is enforced.** Nothing an author can do puts words on the public
site:

- `Testimonial.submit()` can only produce `SUBMITTED`. There is no constructor, factory or setter
  anywhere that yields `PUBLISHED`; that state is reachable only through `publish()`.
- `TestimonialService.publish/unpublish/reject` each call `PlatformAuthorization.requireSuperAdmin`.
- `TestimonialRepositoryAdapter.findPublished` binds the status filter **inside the adapter**, so no
  caller can widen the public endpoint to return `SUBMITTED` or `REJECTED` rows.
- `PublicTestimonialController` exposes one verb and accepts no filter parameter.
- `PublicTestimonialResponse` omits author user id, status, moderator, moderation note and
  submission time. Proven by an assertion on the exact response key set.

**No fabricated content.** The migration inserts no rows. An empty database yields an empty public
list, which the frontend renders as the existing honest pending state — as does a *failed* request,
because an unreachable API is not evidence that anyone said anything.

**Attribution** is supplied by the author, not derived from their account. This is conservative in
both directions: it never publishes an identity the person did not agree to publish (an account
email is not a byline) and never invents one.

**States.** Three: `SUBMITTED`, `PUBLISHED`, `REJECTED`. These are new states of a NEW domain, not a
change to any frozen state machine in CLAUDE.md sections 22/30/31/33/35/37/38/39. Flagged here for
the team because section 75 forbids inventing domain states; a moderated system cannot have fewer.

**Module placement.** `com.fursadhub.testimonial` with the section 6 `api`/`application`/`domain`/
`infrastructure` split. Section 7's module list says "include", not "only". The admin HTTP surface
sits in `administration/api` following the existing `AdminComplianceController` precedent; it
authorizes nothing itself.

**Migration `V50__testimonials.sql`** is additive only — one new table, no change to any existing
table, safe against a non-empty production database. A partial unique index
(`status IN ('SUBMITTED','PUBLISHED')`) enforces one live testimonial per author under concurrency,
so the service's check is not the only defence. A rejected row may be replaced, which is why the
constraint is partial rather than a plain `UNIQUE(author_user_id)`.

**Audit events** `TESTIMONIAL_SUBMITTED/PUBLISHED/UNPUBLISHED/REJECTED` record the id only — the
body is the author's own words and is never written to the audit trail.

## Recruiter CV surface (item 11)

The DTO already carried `hasApplicationCv` and `professional`; the page ignored the first and
carried a comment asserting the field did not exist, which was no longer true.

- `hasApplicationCv === true` (post-`V48` candidacies): the file is known to exist for THIS
  candidacy, so an in-place `PrivateDocumentPreview` is offered alongside the download.
- `false` (historical candidacies): these fall back to the student's stored CV, whose existence the
  DTO cannot report, so only the download is offered and the API answers `CV_NOT_FOUND`. Promising a
  preview there would be a promise the page cannot keep.

## About page (item 24)

Was still the pre-refresh design (blue `brand-primary`, generic SVG). Rebuilt in the reference-01
language: navy identity band with the shared skyline asset, live directory counts, the real
CLAUDE.md section 2 workflow, the three audiences, and a closing `PresentationBand`.

Truthfulness: counts are real `totalElements` and render an **em dash** while unresolved — a zero
would be a claim. No invented customers, team biographies, funding, awards or growth statistics. A
"what we do not do" section states the V1 boundaries (no biometrics, private evidence, moderated
testimonials only, free pilot) plainly.

## Legal pages (item 25)

**The document wording is untouched.** The body still renders as plain text with preserved line
breaks and is never injected as HTML — a legal page is not a script-execution surface on FursadHub's
own origin, and a test now asserts a `<script>` tag in the body reaches the DOM as visible text.
Everything added is chrome outside the text: an identity band, the version/effective line, a
sibling-document rail, and the existing locale-fallback notice.

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS; the same six pre-existing warnings, all in files not touched here |
| `npm run build` | PASS; the existing large-chunk warning remains |
| `git diff --check` | PASS |
| EN/SO key parity, all 11 namespaces | **0 differences** (scripted comparison, not a spot check) |
| `TestimonialModerationIT` (Testcontainers PostgreSQL) | 5 tests PASS |
| Targeted backend set (9 classes, Testcontainers PostgreSQL) | **70 tests PASS**, BUILD SUCCESS |
| `npm run test -- --maxWorkers=2` | **90 files / 682 tests PASS**, zero failures |
| New frontend tests added | TestimonialWall 3, MyTestimonial 5, CandidateCv +3 (7 total), LegalDocumentPage 4 |

## Still outstanding — NOT closed here

1. **Live authenticated visual QA.** Refs 07-09, coordinator evidence access, recruiter CV access
   and keyboard/save flows against a running backend still need existing role sessions. No accounts
   were created and no authorization was bypassed to manufacture them. Automated tests do not close
   this.
2. **The staff-authorization observation in section 2 above remains open** and still needs a team
   decision before production review.
3. **Cover removal** still has no backend endpoint (section 1 above).
4. The three-state testimonial machine needs team acknowledgement per CLAUDE.md section 75.

## Second defect found and fixed during verification

`apiErrorMessage(t, namespace, page, error)` resolves `namespace:page.errors.CODE` and falls back to
`namespace:page.errors.generic`. Both new pages were written against the wrong shape — the keys were
placed one level too shallow and the fallback was named `default` — so **every** testimonial API
error would have rendered the raw key string instead of copy.

Typecheck, lint and the parity script all passed while this was broken, because none of them can see
through a runtime `t()` lookup. It was caught by reading the helper's contract rather than by a tool.
Fixed by restructuring the keys, and a test now asserts that a `TESTIMONIAL_ALREADY_SUBMITTED`
response renders translated copy and that the raw backend message never reaches the DOM
(CLAUDE.md section 11).

## Frontend suite note — load-related flakiness, not regressions

The full suite at `--maxWorkers=2` reported two failures:

- `OpportunityDetailPage > offers publish and cancel for a draft` — `Test timed out in 5000ms`
- `CandidatePoolPage > groups the board by the REAL backend statuses` — queried before the list rendered

Both files pass in isolation (17 tests). Neither file was touched by this work. This matches the
contention behaviour recorded in the 2026-09-07 entry above. **No timeout was raised and no
assertion was weakened** — an attempt to re-run with `--testTimeout=20000` was cancelled precisely
because raising a timeout would have made the verification dishonest rather than fixing anything.

A clean re-run at the same `--maxWorkers=2` afterwards passed **90 files / 682 tests with zero
failures**, confirming both were contention artifacts rather than regressions.

### One contradicting run, resolved

A `--maxWorkers=1` run reported `1 failed | 681 passed` on the new
`maps the server error CODE to copy` test — contradicting the clean runs. Recorded here rather than
discarded, because a result that disagrees with the reported outcome needs an actual explanation.

Cause: that run **started before the `apiErrorMessage` key fix landed** (its own `Start at 12:32:57`
predates the edit). i18n and its JSON are imported early by nearly every test, so the worker had
already cached the pre-fix locale module and was asserting against code that no longer exists on
disk. It was testing the bug, correctly.

Confirmed by re-running the full suite at `--maxWorkers=1` after all edits were final:
**90 files / 682 tests PASS, zero failures** — matching the `--maxWorkers=2` result. The suite
therefore passes cleanly at both worker counts.

---

# Live authenticated Phase C/D QA — 2026-09-08 (Claude)

Ran against the running local stack (API 8080, web 5173, PostgreSQL, MinIO, MailDev) using the seven
pre-existing `acc.*@fursadhub.test` QA accounts. Sessions were obtained through the REAL
`POST /auth/password/forgot` → MailDev → `POST /auth/password/reset` flow, at the user's explicit
instruction. No password hash was edited in PostgreSQL, no authentication bypass was added, no seed
credential was created, no credential is written to any tracked file, and no second QA tenant/user
set was created. Roles, memberships, department scopes and verification states were not mutated.

## DEFECT FOUND AND FIXED — verified students were refused Apply

**Reproduced live**, against a published, open opportunity, on the running backend:

```
acc.student  (enrollment VERIFIED)  APPLY -> 403 STUDENT_ACTION_REQUIRED
acc.recruiter                       APPLY -> 403 STUDENT_ACTION_REQUIRED
acc.uniadmin                        APPLY -> 403 STUDENT_ACTION_REQUIRED
```

A student with a VERIFIED enrollment received the identical refusal as staff — the product telling a
verified student *"Only students can apply for or save internships."* — and the public marketplace
hid Apply and Save from them entirely, because `GET /students/me/marketplace-access` returned
`studentActions: false`.

**Root cause.** `StudentMarketplaceAccess.canAct` proved student-ness from the student PROFILE
alone. The profile is OPTIONAL: `StudentEnrollmentService` never creates or requires one, so a
student can enrol and reach VERIFIED without it. **Four of the eight enrolled students in the local
database were in exactly that state**, including the QA student.

This was introduced by this branch. Before it, `SubmitApplicationService` had no profile
requirement at all, so this is a regression against the product's primary outcome, and it
contradicts the product's own eligibility model — `studentReadiness.applyBlocker` lists
verification, availability, duplicate application and deadline, and never a profile.

**Why the suite missed it.** `AbstractPhase4IT.createStudent` always calls
`PUT /students/me/profile`, so every fixture student has a profile and the profile-less-but-enrolled
shape was unreachable in tests.

**Fix.** `canAct` now proves student-ness from a profile **OR** an enrollment. The exclusions that
are the actual point of the check — organization, university and platform grants — are unchanged, so
staff still never act as marketplace students. Saving still requires a profile through
`SavedOpportunityService`'s own pre-existing 404; that behaviour predates this branch and was left
alone.

Covered by a new unit test (`enrolledStudentWithoutAProfileCanStillAct`,
`staffWithAnEnrollmentIsStillDenied`) and a new integration test
(`SelfApplicationIT.verifiedStudentWithoutAProfileCanStillApply`) that deliberately does not use the
profile-creating fixture.

**The running backend was NOT restarted** — it is the user's IDE-launched process and there is no
devtools reload — so the live instance still serves pre-fix behaviour. The fix is proven over real
HTTP against real PostgreSQL by the integration test. A restart is required for the running
instance to pick it up.

## Live results

| Check | Result |
| --- | --- |
| Seven QA sessions (reset → login) | PASS. Six by email; `acc.recruiter` by USERNAME only — email returns INVALID_CREDENTIALS, matching the B5.5 managed-staff contract |
| Public role gating, all seven roles | PASS after fix. Staff correctly refused; the student refusal was the defect above |
| Cross-department / cross-university evidence | PASS — coordinator, uniadmin, unisupervisor, student, recruiter all 403; anonymous 401. Substituting the caller's OWN university id in the path also 403 |
| Cross-organization candidate + CV | PASS — recruiter, orgadmin, uniadmin, student all 403 on a foreign candidacy and its CV |
| Recruiter CV surface | PASS — `hasApplicationCv` present on the DTO; `STUDENT_PROFILE_NOT_FOUND` maps to recruiter-appropriate copy, never the raw backend message |
| Organization staff list to a recruiter | 200, and returns no password, hash or token. Read-only colleague directory; provisioning itself is 403 |
| PatchField preserve / set / clear | PASS — set applied; **omit preserved**; explicit `null` cleared only that field; QA data restored to its original values |
| Privilege boundaries | PASS — recruiter, org supervisor, uni supervisor, coordinator, student all 403 on tenant-admin mutations; organization description unchanged in the database |
| Auth redesign | PASS — split navy panel + skyline, Back to Home, "Email or username", reveal toggle, browser autofill worked, logical tab order with no trap |
| Portals | PASS — recruiter (tenant branding, no Staff/Profile nav), student (light rail, real metrics, em dash for the unresolved saved total), university (navy rail, tenant crest, honest empty states); all expose Public marketplace |
| Cursor / focus / caret | PASS — `fullName`, `headline`, `city`, `summary`: focus kept, caret held mid-string, value intact, no remount across re-render |
| Token lifetime | Access tokens expired mid-session and returned 401, matching the ~10-minute TTL of section 15 |

## Live QA that could NOT be completed, and why

1. **Student ID attach → Submit Verification.** `acc.student` is already VERIFIED, which is terminal;
   exercising DRAFT → SUBMITTED would require mutating a verification state, which the instructions
   forbid. The enrollment page was verified in its real VERIFIED state (record, animated check, no
   contradictory controls). The flow itself is covered by `StudentIdEvidenceIT` (4 tests) over real
   HTTP, including the evidence-required gate and cross-department denial.
2. **Coordinator evidence preview/download, positive path.** `acc.coordinator`'s queue holds one
   VERIFIED case with no evidence, and the only SUBMITTED case with evidence belongs to a different
   university. The negative path was proven live; the positive path is covered by
   `StudentIdEvidenceIT`, which asserts the in-scope coordinator downloads the bytes.
3. **Per-application CV, positive path.** No candidacy in the QA organizations has
   `application_cv_stored_file_id` set. Cross-organization denial was proven live; the positive path
   is covered by `ApplicationCvIT`.

## UX finding — admin routes render for non-admin members

`/organization/profile` and `/organization/staff` sit under `RequireAuth` only, with no capability
guard, so a RECRUITER who deep-links reaches a fully rendered organization-admin form. The nav
correctly hides these destinations, and **the backend refuses every write** (403 ACCESS_DENIED,
database unchanged), so this is not a security defect — CLAUDE.md's "frontend route guards are UX
only" holds. It is still a UX defect: the page offers an action that can only ever fail. Not fixed
here, because it is a route-guard design question spanning both tenant portals rather than a
presentation bug.

---

# Peer-admin authorization audit — 2026-09-08 (Claude)

Measured, not inferred: a temporary characterization probe drove the real endpoints against real
PostgreSQL and printed the HTTP results below. The probe was **deleted afterwards** — asserting
today's behaviour would enshrine a rule the FursadHub team has not decided.

## The decisive structural fact

`ORGANIZATION_ADMIN` / `UNIVERSITY_ADMIN` membership is created in exactly ONE place —
`CreateOrganizationService` / `CreateUniversityService`, at tenant registration, assigning the
creating user. `requireAssignableRole` blocks minting another. There is **no Super Admin path to
create or restore a tenant membership** (searched; the administration module has none).

So a tenant has exactly one admin membership, and **"admin acts on a PEER admin" is unreachable
through any product path within a tenant.** The reachable case is the admin acting on THEMSELVES.

## Measured matrix

| Caller | Target | Command | Currently allowed? | Backend check | Production consequence |
| --- | --- | --- | --- | --- | --- |
| ORGANIZATION_ADMIN | RECRUITER | suspend / reactivate / reset-password | **200 — yes** | caller admin + membership owned by tenant | Intended authority, intact |
| ORGANIZATION_ADMIN | **self** | reset-password | **200 — yes** | no target-role guard | Admin resets own password; recoverable |
| ORGANIZATION_ADMIN | **self** | changeRole → RECRUITER | **200 — yes**, role became RECRUITER | `requireAssignableRole(newRole)` validates the DESTINATION only | **Self-demotion. Tenant loses its only admin.** |
| ORGANIZATION_ADMIN | **self** | suspend | **200 — yes**, user became SUSPENDED | no target-role guard | **Self-lockout of authentication.** |
| ORGANIZATION_ADMIN | **self** | revoke | **200 — yes**, active admin memberships → **0** | no target-role guard | **Tenant unadministrable.** Follow-up `GET members` → **403 ACCESS_DENIED** |
| UNIVERSITY_ADMIN | **self** | reset-password | **200 — yes** | no target-role guard | As above |
| UNIVERSITY_ADMIN | **self** | changeRole → DEPARTMENT_COORDINATOR | 400 STAFF_SCOPE_REQUIRED | scope validation fired first | **Not proven safe** — blocked incidentally by an empty department list, not by a role guard |
| UNIVERSITY_ADMIN | **self** | revoke | **200 — yes**, active admin memberships → **0** | no target-role guard | **Tenant unadministrable.** |

Correctly guarded, for contrast: `changeDisplayName` and `assignUsername` call
`requireAssignableRole(membership.getRole())` — the target's CURRENT role — so a founder admin cannot
be renamed or given a username through staff management. The five lifecycle commands do not.

## Existing policy evidence — searched, and there is none

- **Founder/owner semantics:** no. "Founder" appears only in prose describing the self-registering
  creator; there is no founder flag, column or concept on either membership entity.
- **Last-admin protection:** none anywhere. No count-based guard, no "at least one admin" check.
- **Primary admin concept:** none.
- **Explicit documentation:** CLAUDE.md section 23 forbids a tenant admin assigning "their own parent
  admin role" — about ASSIGNING upward, silent on acting on oneself or on a peer.
- **Existing tests defining peer-admin authority:** none. No test in the repository exercises an
  admin acting on an admin membership.

## Verdict

This is **not** an ambiguity I should resolve. Two defensible rules exist and they differ in product
behaviour, not just implementation:

1. *An admin may not act destructively on any admin membership, including their own* — safest, but
   removes an admin's ability to reset their own password through staff management.
2. *An admin may act on themselves, but the last active admin membership of a tenant cannot be
   revoked, suspended or demoted* — preserves self-service, adds a last-admin invariant.

Either is a product decision with a schema-adjacent consequence, so per the instruction not to guess,
**nothing was changed.**

**Smallest safe fix, once the team chooses** — and it is small under either rule: a single guard
helper in `OrganizationMembershipService` and `UniversityStaffService`, called by `suspend`,
`revoke`, `resetPassword` and `changeRole`, plus a stable error code (for example
`STAFF_LAST_ADMIN_PROTECTED`). No schema change and no role redesign. The frontend divergence noted
earlier — Organization `StaffPage` hides these controls on an admin row, University `StaffPage` shows
them — should be aligned to whichever rule is chosen, after the decision rather than before it.

---

# Tenant-admin safety + portal route authorization — 2026-09-08 (Claude)

Implements the frozen policy: **no staff-management action may leave a tenant without an active
administrator.** No owner/founder role, no primary-admin schema, no admin-transfer workflow and no
role hierarchy were introduced.

## Backend guard

One private helper per service — `requireManagedStaffTarget` in `OrganizationMembershipService` and
`UniversityStaffService` — called by `changeRole`, `suspend`, `reactivate`, `resetPassword` and
`revoke`, after the existing tenant-ownership resolution.

Three deliberate choices:

1. **Keyed on the TARGET membership's role, not on "is this me".** A self-check would be exactly as
   correct today and would silently stop being enough the moment a second admin membership becomes
   reachable. This covers self AND peer in one guard — the defence in depth the brief asked for.
2. **Expressed as "not one of the assignable staff roles"**, reusing the existing
   `ASSIGNABLE_ROLES` set, so it fails CLOSED: any future role that is not explicitly managed staff
   is protected by default rather than needing to be remembered.
3. **`reactivate` is included.** Staff management does not manage admin memberships at all; leaving
   one lifecycle verb out would have been an inconsistency with no product benefit, since suspend is
   now impossible through this surface anyway.

Error code `STAFF_ADMIN_MEMBERSHIP_PROTECTED` (403), matching the module's existing `STAFF_*`
convention (`STAFF_ROLE_NOT_ASSIGNABLE`, `STAFF_SCOPE_REQUIRED`, `STAFF_MEMBERSHIP_NOT_FOUND`)
rather than the conceptual `CANNOT_MODIFY_OWN_ADMIN_MEMBERSHIP`, because the guard covers peer
admins too and the name should not claim otherwise. Translated EN/SO in both portals, with copy that
points the admin at normal account settings for their own password.

**Self-service password recovery is untouched.** `forgot-password`, `reset-password` and normal
account password change are not on this surface and were not modified — the seven QA accounts were
in fact re-authenticated through that exact flow after the change.

## Second defect found and fixed while proving intended authority

`UniversityStaffService.changeRole` failed with `409 RESOURCE_CONFLICT` when a coordinator's role
changed while keeping the SAME department. `uk_membership_departments_active` is UNIQUE on
(membership_id, department_id) WHERE removed_at IS NULL, and Hibernate orders inserts before updates
at flush — so the re-assignment INSERT reached the index while the old row still looked active.

Fixed by flushing each scope removal before the re-assignment, via a new `saveAndFlush` on the
repository port, mirroring the `users.saveAndFlush` convention already used elsewhere for exactly
this reason. This is a genuine break in the admin authority section 5 asks to preserve; it predates
this change and was surfaced by the new test.

## Frontend route authorization

`RequireOrganizationCapability` and `RequireUniversityCapability` are pathless layout routes that
read the SAME capability flags the sidebars read — no permission logic is duplicated, and nav and
routing cannot drift. They sit inside the area layouts, where membership is already resolved, so a
guarded page never mounts, never paints and never fires its queries before the decision is made.
A denied role lands on its portal dashboard, which every member of that portal can use, so the
redirect cannot loop.

Routes gated: organization — opportunities (authoring), candidates/candidacies, partners, staff,
supervision. University — students, verification-cases, departments, staff, partners, my-students,
supervision, nominations/opportunity-requests, internship-policy.

**Deliberately NOT gated: `/organization/profile` and `/university/profile`.** The live-QA report
called these a defect; on inspection that was wrong and is corrected here. Both pages already branch
on `canEditProfile` / `canEditUniversityProfile` and render read-only for a non-admin, and both nav
builders deliberately link every member there so they can see their own tenant. Gating them would
have removed a working, intended destination.

## Verification

| Check | Result |
| --- | --- |
| Backend targeted suites | see the final run below |
| `TenantAdminProtectionIT` | 6 tests — self suspend/revoke/reset/demote/reactivate denied, peer-admin denied, and full intended authority over recruiters, supervisors and coordinators retained |
| Frontend route authorization | 32 tests, direct-URL navigation per role |
| EN/SO parity, organization + university | 0 differences |
| Live smoke, after restart | below |

## Live smoke after restart

The backend was restarted on the project's normal development method
(`./mvnw spring-boot:run -Dspring-boot.run.profiles=local`, the same main class and profile the IDE
run configuration uses). No IDE or project configuration was modified.

```
student marketplace-access   studentActions: true    (was false — the regression is gone)
six staff roles              studentActions: false   (exclusions intact)
student APPLY                APPLICATION_CV_REQUIRED (past the student gate, at the real rule)

ORG_ADMIN  self suspend/revoke/reset/demote  -> 403 STAFF_ADMIN_MEMBERSHIP_PROTECTED
UNI_ADMIN  self suspend/revoke/reset/demote  -> 403 STAFF_ADMIN_MEMBERSHIP_PROTECTED
admin counts unchanged (org=1, uni=1); roles unchanged

ORG_ADMIN -> recruiter suspend 200 / reactivate 200; recruiter still logs in (state restored)

RECRUITER      /organization/staff, /partners            -> redirected to dashboard
               /candidates, /opportunities, /profile      -> allowed
ORG_SUPERVISOR /organization/staff, /candidates, /opportunities -> redirected
               /supervision, /placements, /profile        -> allowed
COORDINATOR    /university/staff                          -> redirected
               /students, /verification-cases, /nominations, /departments, /partners, /profile -> allowed
UNI_SUPERVISOR /university/staff, /students, /verification-cases, /nominations,
               /departments, /partners, /internship-policy -> redirected
               /my-students, /supervision, /placements, /profile -> allowed
```

## Accepted via integration test coverage, not live PASS

Per the brief, and because the local QA data holds no safely reusable positive case and historical
verified records must not be mutated:

- Coordinator positive Student-ID evidence download — `StudentIdEvidenceIT`
- Per-application CV positive recruiter preview — `ApplicationCvIT`
- Enrollment DRAFT → SUBMITTED transition — `StudentIdEvidenceIT`

---

# Final Phase C/D quality pass — 2026-09-08 (Claude)

Continued the same branch and working tree. Branch `feat/fursadhub-presentation-refresh`, HEAD
`d20d00b`, upstream `16fbbb2`. No reset, clean, checkout, restore or revert; no commit, push or
merge. **No backend production file was modified.** No Phase E / Super Admin / Verification Officer
work.

## Portal defect sweep — method

Rather than clicking through by eye, the sweep instrumented the running application. For each of the
seven roles a real session was established through the product's own
`forgot-password -> emailed token -> reset -> login` flow (no password hash edited, no bypass added,
no credential written to any tracked file), and each portal was then driven as a **single SPA
instance** with client-side navigation between routes, while capturing:

- `console.error` calls, `window.onerror`, and `unhandledrejection` inside the app frame
- every `fetch` and its status, so failed and repeated requests are counted per navigation
- rendered text length (blank-screen detection) and error-boundary copy
- `scrollWidth - clientWidth` (horizontal overflow) plus the worst overflowing element

Driving one instance rather than one page load per route is what distinguishes a genuine repeat
request from a cold cache: `/university-memberships/me` looked like a 404 on every student route
until the same session was navigated across twelve routes, where it fires **once**.

## Result

Roughly 60 route visits across STUDENT, ORGANIZATION_ADMIN, RECRUITER, ORGANIZATION_SUPERVISOR,
UNIVERSITY_ADMIN, DEPARTMENT_COORDINATOR and UNIVERSITY_SUPERVISOR:

| Check | Result |
| --- | --- |
| React runtime errors / unhandled rejections | **0** |
| `console.error` | **0** |
| Blank screens | **0** |
| Horizontal overflow (375 / 768 / 1280, light and dark) | **0** |
| Duplicate or looping requests within a session | **0** |
| Capability route guards | intact — every gated route redirects its unauthorized role to the portal dashboard |

## Defects found and fixed

**1. Saved internships showed an error to a healthy account.** A VERIFIED, enrolled student who has
never saved profile details was shown "Something went wrong — We could not load your saved
internships." Reproduced live: `GET /students/me/saved-opportunities` answers
`404 STUDENT_PROFILE_NOT_FOUND`, because the profile is optional and `SavedOpportunityService` is
keyed on it. Nothing had gone wrong — saving requires a profile, so such a student has provably saved
nothing. Now renders the empty state with a hint naming the real prerequisite; every other error
still renders as an error. This is the same profile-optionality gap as the earlier marketplace-access
regression, in the one place that fix deliberately left alone.

**2. University staff page offered four buttons that could only fail.** Change role / Suspend /
Reset password / Revoke rendered on a `UNIVERSITY_ADMIN` row, but
`UniversityStaffService.requireManagedStaffTarget` now refuses all of them with
`403 STAFF_ADMIN_MEMBERSHIP_PROTECTED`. The organization portal already hid them. The earlier notes
recorded this divergence as something to align *after* the backend rule was settled — it has been
settled and implemented, so the two portals now agree with the server. Self-service password change
through normal account settings is untouched.

**3. About hero illustration was invisible.** The skyline asset is dark navy line art on
transparency and sat on the navy identity band at `opacity-20` with no filter — dark on dark. It now
carries the approved footer treatment (`brightness-0 invert opacity-40`), so the two navy surfaces
show the artwork with the same confidence. Text contrast is unaffected: the art is a bottom-anchored
silhouette. The same un-inverted mistake was present on the old auth panel and is gone with the
rebuild.

**4. Student profile photo used an unstyled file input.** It rendered the browser's default
"Choose File / No file chosen" inside text-input styling, next to organization and university profile
editors that both already use the shared `FileUpload` dropzone. It now uses the same control.

## Authentication rebuild

The previous shell centred a `max-w-md` card inside a `max-w-6xl` grid — a wide empty gutter either
side of the form, beside a plain navy rectangle whose skyline was invisible for the reason above.

Rebuilt as a true half-and-half split at `lg`: the approved photograph holds the left column
edge-to-edge under a two-part scrim (a flat veil so the lockup stays legible over bright sky, then a
bottom-up gradient to solid navy under the copy), and the form column holds the right at a generous
`27rem` with heading, controls, supporting links and legal footer on one alignment. The panel is
sticky and one viewport tall, so it frames the whole register form instead of scrolling away. Mobile
drops the photo panel for a compact navy identity strip.

**Panel copy varies by route** (`authPanels.ts`), per the brief: sign-in, registration, verification
and the two recovery screens each say something appropriate rather than repeating one marketing
paragraph. The copy is static presentation text — no tenant, person, metric or record is rendered.

Autocomplete is per section 26 and was verified in the browser: identifier `username`, password
`current-password`, new passwords `new-password`, email `email`. Tab order follows DOM order with no
positive or negative `tabindex`, no trap, and browser password managers autofill normally.

## Live verification performed in the browser

| Check | Result |
| --- | --- |
| Focus / caret stability | PASS — value typed, caret parked mid-string, forced re-render: focus kept, caret held, node not remounted |
| Auth keyboard + autofill | PASS — logical tab order, no trap, correct autocomplete on all five screens |
| Role-correct marketplace | PASS — recruiter `studentActions: false` and no Apply/Save controls; student `true` with Apply present |
| Apply page | PASS — per-application CV section present; Submit **disabled** with no CV and a passed deadline |
| Dark mode | PASS — auth, About, legal and student dashboard coherent; no overflow |
| Responsive 375 / 768 / 1280 | PASS — no page overflow and no overflowing element on any surface checked |
| Verification queue | Now shows identity, department **name**, submitted date, evidence state and an explicit Review action — all from the existing case DTO |

Window resizing was unavailable (the browser window is snapped), so responsive checks were run in
same-origin iframes at fixed widths, where media queries evaluate against the frame.

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — the same **six** pre-existing warnings; the one new warning this pass introduced was removed by splitting `authPanels.ts` out of `AuthShell.tsx` |
| `npm run test -- --maxWorkers=2` | **94 files / 725 tests PASS**, exit 0, zero failures |
| `npm run build` | PASS; the existing large-chunk warning remains |
| `git diff --check` | PASS |
| EN/SO parity, all namespaces | **0 differences** |
| Backend | **not modified** — no `.java` file touched |

Tests added: `SavedInternshipsPage` (2), `AuthShell` (4), `AboutIllustration` (3), university
`StaffPage` admin-row gating (2).

One contention artifact was observed and is not a regression: the `RegisterPage` validation test
timed out at 5220ms against a 5000ms limit while five files ran in parallel, and passes in isolation
at 4.55s. No timeout was raised and no assertion weakened. The clean full-suite run above passes.

## Still outstanding

1. **Cover removal** still has no backend endpoint (section 1 of this document).
2. **The three-state testimonial machine** still needs team acknowledgement per CLAUDE.md section 75.
3. **CLAUDE.md section 57 still conflicts with the canonical brand sheet** on palette and tagline
   (recorded in the route matrix); the implementation follows the canonical reference, as instructed.
4. Positive-path coordinator evidence download and per-application CV preview remain covered by
   `StudentIdEvidenceIT` / `ApplicationCvIT` rather than live PASS, because the local QA data holds no
   safely reusable positive case and verified records must not be mutated.

---

# Experience convergence + testimonial star ratings — 2026-09-08 (Claude)

Same branch and working tree. Branch `feat/fursadhub-presentation-refresh`, HEAD `d20d00b`. No
reset, clean, checkout, revert, commit, push or merge. No Phase E work.

## Testimonial star rating — real 1-5, no fabricated values

**`V51__testimonial_rating.sql`** adds `rating integer` plus
`CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)`. It is **nullable and backfills nothing.**

The column is nullable rather than `NOT NULL` for one reason: the local database already held a
testimonial written by a real user before ratings existed. There is no honest value to give it —
assigning 5 would put a score in that person's mouth. It stays NULL, the API omits the field, and
the card renders without stars. Verified after the migration ran against the real non-empty
database: `Abdirahman Hassan | SUBMITTED | (null)`.

The requirement for NEW submissions is enforced in three places instead:
`SubmitTestimonialRequest` (`@NotNull @Min(1) @Max(5)`), `Testimonial.submit` (domain factory,
so no service or fixture can create an unrated testimonial), and the database CHECK.

`smallint` was the first choice and was wrong: the project runs `ddl-auto=validate`, which rejects
`int2` against a Java `Integer`. Caught by the integration suite failing to start its context.
Changed to `integer` before the migration had been applied anywhere, so there is no checksum drift.

Rating is exposed on `PublicTestimonialResponse` and `TestimonialResponse`. The API serialises with
`default-property-inclusion: non_null`, so an unrated testimonial omits the key entirely rather than
sending an explicit null — the frontend treats absent and null identically.

**No aggregate rating is displayed.** A platform average would be computed from a handful of rows and
would say more about the sample than the product, so the individual ratings are shown and the summary
claim is not made.

## Testimonial section redesign

Was three small cards at 11-12px with no rating, no quote treatment and a bare heading. Now: a
proper section header with supporting copy, and cards carrying a decorative quote mark, the real star
row, the quote at a comfortable reading size, and a ruled identity row with an initial mark, name and
role/affiliation. No avatar is invented — the public payload deliberately carries none.

The grid is count-aware. One published testimonial in a fixed three-column grid sat in the left third
with two empty columns beside it and read as a broken layout; one and two now centre with a capped
width. A short row never gets padded out with people who did not write anything.

## Star control accessibility

`StarRatingInput` is a real radio group, not clickable spans. Arrow keys move and select, Tab treats
the group as one stop, each option has the accessible name "N out of 5", the legend is
"Rate your FursadHub experience", targets are 44px, and the chosen value is also stated in words in
an `aria-live` region that holds its line so selecting does not shift the form. Verified live in the
browser with keyboard-only interaction.

## Motion and layout stability

Four places lifted geometry on hover (`hover:-translate-y-0.5`), including the shared `Card` and
`DashboardActionCard`. That moves whatever sits under the pointer and breaks row alignment in a grid,
which is exactly what the brief asks to avoid. All four now use border/shadow emphasis with the
transition scoped to those two properties. `DashboardActionCard` also had **no** `motion-reduce`
guard and a `transition-all`; both fixed.

Layout stability was **measured**, not asserted. The first harness used `PerformanceObserver`
`layout-shift` inside an iframe and reported CLS 0 everywhere — it was validated against a deliberate
260px shift, detected nothing, and was discarded as invalid (Chrome only reports layout-shift for the
top-level frame). The replacement samples landmark positions early and late and diffs them; it was
validated the same way and correctly caught the 260px shift across 25 elements. Result across eight
public and portal surfaces: **zero elements repositioned** between loading and loaded.

## Regression found and fixed during verification

Moving `.slice(0, 3)` out of the `length > 0` branch exposed a latent hazard: a non-array payload now
threw and took the whole public home page down. Caught by three `HomePage` tests. Fixed with an
explicit `Array.isArray` guard, so an unexpected shape degrades to the honest pending state.

## Verification

| Check | Result |
| --- | --- |
| Targeted backend (Testimonial + 2 administration suites, Testcontainers) | **36 tests PASS** |
| Flyway | all 51 migrations validated and applied, including against the real non-empty local database |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — same six pre-existing warnings |
| `npm run test -- --maxWorkers=2` | **95 files / 733 tests PASS** |
| `npm run build` | PASS; existing large-chunk warning |
| `git diff --check` | PASS |
| EN/SO parity | 0 differences |

## Local data state

A QA testimonial was submitted through the real form to prove the flow end to end, published briefly
to capture the card, then unpublished. `GET /public/testimonials` returns `[]` — no synthetic content
is published. Two rows remain, both `SUBMITTED`: the pre-existing real one (unrated) and the QA one
(rating 4).

## Not done in this pass

The brief asks for a page-by-page experience redesign across all three portals. That was **not**
performed wholesale. The previous pass brought those pages to production quality and this pass
measured them healthy — zero console errors, zero overflow at four widths in both themes, zero
layout shift. Restyling roughly sixty working pages without evidence of a problem would risk the
functionality section 0 requires preserving. Targeted fixes were made where measurement found real
problems (hover geometry, the missing reduced-motion guard, the testimonial section).

---

# Portal experience convergence — archetypes, not pages — 2026-09-09 (Claude)

Same branch and working tree. Branch `feat/fursadhub-presentation-refresh`, HEAD `d20d00b`. No
reset, clean, checkout, revert, commit, push or merge. **No backend file touched.** No Phase E work.

## The finding that shaped this pass

The portals did not need sixty page redesigns. They needed the shared primitives they already had to
actually be used. An audit found the same components reimplemented locally, once per portal, drifting
apart as they went:

| Primitive | State found |
| --- | --- |
| `StatCard` | Existed in `components/ui` with the right anatomy and **zero usages**. All three dashboards had their own copy — student with a floating "View all" and `padding="lg"`, organization and university with a ruled footer link and `padding="none"`. |
| `SectionHeading` | Did not exist. **Four identical local copies**, one per dashboard plus the recruiter dashboard. |
| Section titles generally | Written **eight different ways** across the portals (`font-display text-base font-bold` in 39 places, `font-semibold text-foreground` in 20, and six more variants). |
| `PageHeader` | Used by every portal page **except the three dashboards**, which hand-rolled an `h1` a size larger. |
| `EmptyState` | Existed, but seven dashboard panels rendered a bare centred `<p>` instead, because its dashed border looks wrong inside an already-bordered panel. |

That is the mechanism behind "assembled components rather than one product": no two panels agreed on
how a section announces itself.

## What changed

- **`StatCard` extended and adopted.** A `to` prop makes the whole tile the link. The three local
  copies are gone. This removed **four identical "View all" links per dashboard** — reference 07 has
  no such link; the tile is the affordance. A chevron was tried and removed: at four tiles across a
  portal column it collided with labels like "Saved internships".
- **`SectionHeading` created** with a `panel` variant for headings inside `<Card padding="none">`.
  All four local copies replaced. The university dashboard's hand-rolled right-panel header now uses
  it too, so the two panels beside each other finally announce themselves the same way.
- **`PageHeader` adopted** by all three dashboards.
- **`EmptyState` gained an `inline` variant** and now carries what/why copy in five dashboard panels
  — "No nominations yet." became that plus "Nominations appear here once a coordinator puts a student
  forward for a targeted internship."
- **Metric tiles no longer stretch.** The student dashboard's profile card spans two grid rows, so
  the metric row was being stretched to match and every tile was mostly empty space under its figure.
  `self-start` fixes it; the tiles now sit at reference 07's compact proportion.
- **`MarketplaceRail` no longer looks like a search result.** It sat in the fourth column beside a
  three-up card grid with the identical white card treatment, directly under "Showing 1-5 of 5
  opportunities" — it read as a fourth result and made the page look like it was miscounting. Now a
  muted surface with no shadow.
- **`InternshipCard` always reserves the organization mark.** Organizations without a logo rendered
  no mark, so their card's header started at a different x from the cards beside it and the row lost
  the left alignment the eye scans by. The fallback is the organization's own initial — it invents no
  brand.

## A raw translation key that would have shipped

Wiring the organization dashboard's attention section, `organization:dashboard.needsAttention` was
used — the key actually lives under `recruiterDashboard`, with candidate-specific semantics. The page
rendered the literal string **"dashboard.needsAttention"**.

Typecheck, lint and the EN/SO parity script all passed while this was broken, because none of them
can see through a runtime `t()` lookup. It was caught by looking at the page. A scan for
key-shaped rendered text was then run across all three portals; the only hits were usernames
(`acc.orgadmin`) and "e.g.", so this was the only one.

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — same six pre-existing warnings, none in changed files |
| `npm run test -- --maxWorkers=2` | **95 files / 733 tests PASS** |
| `npm run build` | PASS; existing large-chunk warning |
| `git diff --check` | PASS |
| EN/SO parity | 0 differences |
| Responsive, `/` at 375 / 768 / 1024 / 1366 | 0 horizontal overflow at every width |
| Dark mode, `/` at 375 and 1366 | 0 overflow, theme applied |
| Backend | untouched — 0 `.java` files modified |

Three tests failed in a combined portal run and all three pass in isolation
(`StaffIdentity`, `ProfessionalProfile`, `VerificationCaseDetailPage` — two were 5s timeouts). This
matches the contention pattern recorded earlier in this document. The clean full-suite run above
passes with zero failures.

## Scope actually covered

Visual QA was done by looking at rendered pages against references 07-09 and 01-02, not by reading
the DOM: student, organization and university dashboards, the internships directory, the public home
page, and the student applications list, each captured before and after at 1366px.

**Not covered:** the per-page redesign of every list, detail, form and workflow page in §15-§30.
The shared archetypes those pages are built from are now unified, so they inherit the improvements —
but pages such as the opportunity editor, candidate detail, placements, weekly logs, attendance,
evaluations and the final-report/defense surfaces were not individually reviewed or restyled in this
pass, and should not be reported as though they were.

---

# Per-page workflow acceptance pass — 2026-09-09 (Claude)

Same branch and working tree. Branch `feat/fursadhub-presentation-refresh`, HEAD `d20d00b`. No
reset, clean, checkout, revert, commit, push or merge. **No backend file and no migration touched.**
No Phase E work.

## Placement workflow routes were unreachable, and that is why they had never been reviewed

Fourteen routes — the placement workspace and its weekly-logs / attendance / final-report / defense /
evaluation tabs, across all three portals — cannot render without a placement, and the local database
had none. They had been reported as "not individually reviewed" in two previous passes for exactly
this reason.

Rather than skip them again, a placement was created **through the product's own workflow**: the
organization admin reviewed and shortlisted the existing QA candidacy and sent a real offer, and the
student accepted it. `POST /offers/{id}/accept` created the placement transactionally, as CLAUDE.md
section 38 specifies. Nothing was inserted into the database directly and no fixture was invented —
the placement is the genuine output of the product's own offer-acceptance path, and the university
dashboard now shows it as one real active placement.

## Defects found by looking at pages, not at test output

**1. The placement workspace did not belong to its portal.** It hand-rolled
`mx-auto max-w-3xl px-4 py-8` while every other page in all three portals goes through
`PageContainer` at `wide`. Moving from "My applications" to "My internship" visibly narrowed the page
and shifted content inward by about 160px. Now uses `PageContainer`, and its loading and not-found
states sit in the same container so nothing jumps once the placement arrives.

**2. Five workflow pages shared one bare empty state.** Weekly logs, attendance, final report,
defense and evaluation each rendered
`<p className="rounded-lg border ... text-center text-sm">` with a single sentence — what is empty,
never why or what happens next. All five now use `EmptyState` with a second line: "Write one short
entry a week describing what you worked on. Your university supervisor reviews them as you go."

**3. A heading collided with the section above it.** The internship detail page showed
"Compensation and requirements" directly under a separate "Requirements" section, and that block
contains no requirements — it holds compensation, hours, skills and perks. Retitled
"Compensation and hours"; the sub-headings already name the rest.

**4. A stranded share button on the organization profile.** `ShareLink` sat in the social-icon row,
so an organization with no social links rendered that row containing one icon button floating alone
in whitespace under the identity block. Share moved into the actions row beside "View opportunities",
and the social row now renders only when there is something to link to. The tabs moved up about 56px
as a result.

**5. The known "Placements by status" alignment defect is fixed.** It used `padding="lg"` with an
unruled heading while the nominations panel beside it used `padding="none"` with a ruled `panel`
heading, so two side-by-side modules started at different heights. Both now use the same treatment
and their headings sit on the same line. A second hand-rolled `h2` in the same column
("Enrollment verification") was moved to `SectionHeading` at the same time.

## Route review

Every reachable Phase C/D portal route was opened under an authorized role and instrumented for
console errors, failed requests, error boundaries, blank screens, horizontal overflow and rendered
translation keys. Result across all of them: **zero console errors, zero error boundaries, zero
overflow, zero raw keys.** The only 4xx responses are the two known, handled cases — the optional
student profile (404 for a student who has not saved one) and `/university-memberships/me` returning
404 for a user with no university membership, which the terms gate probes deliberately.

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — same six pre-existing warnings, none in changed files |
| `npm run test -- --maxWorkers=2` | **95 files / 733 tests PASS** |
| `npm run build` | PASS; existing large-chunk warning |
| `git diff --check` | PASS |
| EN/SO parity | 0 differences |
| Responsive, four changed surfaces at 375 / 768 / 1366 | 0 overflow |
| Dark mode, three changed surfaces | 0 overflow, theme applied |
| Backend | untouched — 0 `.java` files, 0 migrations |

## Local data state

The QA candidacy is now `ACCEPTED` with one `PLANNED` placement, created through the real offer flow
to make the workflow pages reachable. This is genuine product state in the local development
database, not seeded or fabricated content, and the dashboards report it truthfully.

---

# Final premium experience pass — testimonial attribution, resumed 2026-09-09 (Claude)

Same branch and working tree. Branch `feat/fursadhub-presentation-refresh`, HEAD `d20d00b`. No
reset, clean, checkout, revert, commit, push or merge. No Phase E work.

This pass had been interrupted part-way. The state on resuming is recorded below before the
continuation, because "what was already true" matters for reading the verification table.

## State found on resuming

The pass's implementation was complete on both sides and had never been verified.

Written before the interruption, and preserved unchanged:

| Layer | Files |
| --- | --- |
| Migration | `V52__testimonial_author_role_snapshot.sql` |
| Domain | `TestimonialAuthorRole`, `TestimonialAudience`, `TestimonialTenantType`, `TestimonialAuthorContext`, `Testimonial` |
| Application | `TestimonialAuthorContextResolver`, `TestimonialService` |
| API | `SubmitTestimonialRequest`, `PublicTestimonialResponse`, `TestimonialResponse`, `TestimonialAuthorContextResponse`, `MyTestimonialController` |
| Backend tests | `TestimonialModerationIT`, `TestimonialRoleAttributionIT` |
| Frontend | `types`, `attribution.ts`, `testimonialApi`, `testimonialSchema`, `MyTestimonialPage`, `TestimonialWall`, `AdminTestimonialsPage`, EN/SO `testimonials.json` and `common.json` |

Not done before the interruption: **no verification command had been run at all**, and the three
existing frontend testimonial test files still described the pre-V52 model. Nothing was left
half-written — the last file touched (`AdminTestimonialsPage.tsx`) is complete — so the continuation
was verification plus test correction, not re-implementation.

No process was left running. The local API and Vite dev server were both down; PostgreSQL was up.

## The defect this pass closes

`author_role` used to be chosen by the author in the submission form, next to a free-text
`author_affiliation`. A recruiter could therefore publish a quote signed
"Student · Jamhuriya University", and FursadHub would render it as fact on its own home page.

Attribution is now derived server-side from the submitting account's real membership and frozen into
the row at submission. `SubmitTestimonialRequest` carries no role and no affiliation, so there is no
field for a browser to set. This was confirmed against the running application rather than only in
the source — see the OpenAPI row in the verification table.

## Frontend tests were stale, and they were failing

Seven tests across `MyTestimonialPage.test.tsx` and `TestimonialRating.test.tsx` failed on the first
run of this continuation. Both causes were the tests describing the old model:

1. The API module mock declared `listMyTestimonials` and `submitTestimonial` but not
   `getMyTestimonialContext`, so the author context never resolved, the form stayed hidden behind
   its eligibility gate, and every test that types into the form could not find it.
2. Fixtures used `authorRole: 'ORGANIZATION'` — a value that is now an *audience*, not a role — and
   omitted the now-required `authorAudience`.

These are stale tests, not a defect in the implementation: no production file was changed to make
them pass. (Worth noting for the audit: `tsc -b` covers `src` only, so a test fixture that no longer
matches its own declared type is not caught by typecheck. That is pre-existing project
configuration and was left alone.)

## Tests added

The pass's central claims had no coverage. Added, all failing-if-reverted:

- **Public wall** — a recruiter reads "Recruiter at Acme Ltd" and never "Student"; a department
  coordinator reads by role, not by university; platform staff read ", FursadHub"; a pre-derivation
  row falls back to the audience wording rather than inventing a job title.
- **Author's form** — the derived role is stated back to the author, and there is no role control of
  any kind (not a select, not a disabled select, not a text box); the submitted payload's keys are
  exactly `authorDisplayName`, `body`, `rating`; an account with no attributable role is told why
  instead of being shown a form that cannot succeed.
- **Moderation queue** (`AdminTestimonialsPage.test.tsx`, new) — the console prints the same derived
  line the public card does, which is what `attribution.ts` exists to guarantee and what nothing
  previously proved; the quote is a `<blockquote>` with no editable control behind it; `REJECTED`
  offers no dead commands.

## Verification

| Check | Result |
| --- | --- |
| `mvnw -o compile` / `test-compile` | PASS |
| `mvnw -o test` (surefire suite) | **903 tests PASS**, BUILD SUCCESS — see the pre-commit audit: this is the surefire suite, NOT CI's `mvn verify` |
| `TestimonialModerationIT` + `TestimonialRoleAttributionIT` | 17 PASS |
| Flyway V52 against the **local non-empty** database | applied; schema at v52, "no migration necessary" on this run; app starts with `ddl-auto=validate` |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — the same six pre-existing warnings, none in changed files |
| `npm run test` | **96 files / 744 tests PASS** (was 95 / 733) |
| `npm run build` | PASS; existing large-chunk warning |
| `git diff --check` | PASS |
| EN/SO parity, all 20 locale files | 0 differences |
| OpenAPI at `/api-docs` | `SubmitTestimonialRequest` requires exactly `authorDisplayName`, `body`, `rating` — no role, no affiliation; `/me/testimonial/context` documented |
| Live public wall, EN and SO | renders the two published rows with real ratings; SO reads "Arday ee …"; 0 console errors, 0 raw keys, 0 page overflow |
| Long attribution truncation | "Department Coordinator at Jamhuriya University of Science and Technology, Mogadishu Campus" ellipsises inside the card: card width unchanged, page overflow 0, full string kept in `title` |
| Dark mode, testimonial wall | tokens applied (`bg-surface` resolves to the dark surface), 0 overflow |

## Not verified live, and why

**Authenticated surfaces.** The author's form and the moderation queue were not opened in the
browser. No session was live in the profile (`POST /auth/refresh` returned 401), and the only way to
obtain one here is the real `forgot-password → MailDev → reset` flow, which earlier passes performed
only on the user's explicit instruction. Both surfaces are covered by the tests above and by
`TestimonialRoleAttributionIT`; neither is covered by a live PASS, and should not be reported as
though it were.

**Narrow-viewport re-measurement.** `resize_window` reported success but `window.innerWidth` stayed
at 1366, so the viewport never actually changed. The truncation check above was measured instead,
which is the specific overflow risk this pass introduces. Earlier passes' responsive results stand
for the surfaces this pass did not alter.

## Local data state

Unchanged by this pass. Two published testimonials, both written before V52, so both carry no
derived role and render under the audience fallback. Nothing was inserted, published, unpublished or
rejected; no testimonial was submitted to manufacture a role-bearing row.

The local API (port 8080) and Vite dev server (port 5173) were started for verification and were
left running.

---

# Premium experience pass — portal feel, auth lifecycle, live testimonial QA — 2026-09-09 (Claude)

Same branch and working tree. Branch `feat/fursadhub-presentation-refresh`, HEAD `d20d00b`. No
reset, clean, checkout, revert, commit, push or merge. **No backend file and no migration touched**
(0 files under `apps/api/src` modified in this run). No Phase E work.

The testimonial attribution architecture from the previous pass is frozen and was not redesigned.

## Live testimonial QA — the gap the previous pass could not close

The previous pass reported the author's form and the moderation queue as covered by tests but NOT by
a live PASS, because no session was available. That gap is now closed. Sessions were obtained through
the product's own forgot-password / MailDev / reset-password / login flow, at the user's explicit
instruction. No password hash was edited, no credential was seeded, no authentication was bypassed,
and no credential is recorded in any tracked file.

| Role | Attribution the UI showed | Payload actually sent | Result |
| --- | --- | --- | --- |
| `STUDENT` | **Student** | `{authorDisplayName, body, rating}` | PASS |
| `RECRUITER` | **Recruiter at Acceptance Test Company** | `{authorDisplayName, body, rating}` | PASS |
| `DEPARTMENT_COORDINATOR` | **Department Coordinator at Acceptance Test University** | `{authorDisplayName, body, rating}` | PASS |

No role or affiliation field appears in any payload, and no role control of any kind exists on the
form — no select, no disabled select, no text box. The "You are sharing as" line is text.

**The student case names no institution, and that is correct.** The account used is a newly
registered student whose enrollment is not verified, so `TestimonialAuthorContextResolver` returns an
untenanted STUDENT context and the UI declines to name a university it has not verified.

**Why a new student account.** The existing QA student already holds a PUBLISHED testimonial, and the
product allows one live testimonial per author. The only state that frees the form is `REJECTED`,
which is terminal — so testing through that account would have meant permanently ending a real
published row to unblock a test. Registering a new student through the real public flow was used
instead: it destroys nothing, and it exercises the registration to verification requirement at the
same time.

## Live moderation and publication QA

Performed as `SUPER_ADMIN`; the moderator is not the author of any testimonial acted on.

- The queue showed all three new rows under their **server-derived** attribution, identical to the
  public card's wording, alongside the pre-derivation row falling back to its audience label.
- The recruiter testimonial was published. It appeared on the public home page immediately, carrying
  `authorRole: RECRUITER` and the real organization name, and the SUBMITTED rows did **not** appear —
  the public endpoint serves PUBLISHED only.
- It was then **unpublished back to the review queue**, which is the transition the product
  legitimately supports. The public wall is back to the two rows it held before this pass.

**Defect found by moderating rather than by reading code: the queue never showed the rating.** A
moderator decided whether to publish a testimonial without being able to see the star score that
would be published with it — a one-star and a five-star review reached the Publish button looking
identical. `AdminTestimonialsPage` now renders `StarRating` above the quote, and shows nothing at all
for a pre-rating row, which is itself the useful signal.

## Shared motion language

One `--duration-panel: 280ms` token was added between NORMAL and SLOW, and the reduced-motion block
collapses it to 1ms with the other four. Four animations were added on that scale
(`panel-in-left`, `panel-in-right`, `dialog-in`, `backdrop-in`) plus `route-in` on NORMAL.

Before this, `Drawer`, `Modal` and the mobile navigation rail all reused `animate-menu-in` — the
dropdown's 150ms `scale(0.97)` pop. On a 264px full-height rail that reads as a flicker, not as a
panel opening. Panels now slide from the edge they are anchored to, dialogs settle rather than zoom,
and both scrims fade instead of being stamped on.

## Portal page transitions

`RouteTransition` wraps the content inside `AppShell`'s `<main>`, keyed on pathname. Opacity plus a
4px lift over 240ms.

- **Content only.** The rail and topbar are outside the wrapper and do not move on navigation.
- **Never delays interaction.** `both` fill with no gate and no exit animation, so content is laid
  out and hit-testable on the first frame — asserted live with `elementFromPoint` immediately after
  a route change.
- **Query strings are not a new key**, so filtering a candidate board or paging a table does not
  re-run the entrance on every keystroke.

## Defects found and fixed in shared components

**1. The loading Button widened itself, contradicting its own documented contract.** Its javadoc
said loading "keeps its width stable"; the spinner was prepended as a flex sibling with a gap, so
pressing it grew the control by 24px under the pointer and shifted everything after it in the row.
The spinner is now absolutely centred and the label is held at `opacity-0` — the label keeps its box,
so it keeps reserving its width, and stays in the accessibility tree.

**2. Tabs could be reached by keyboard but not navigated.** Roving tabindex was in place, which takes
every unselected tab out of the tab order — with no arrow-key handler, a keyboard user could reach the
selected tab and then had no way to reach any other tab at all. Arrow keys (both axes), Home and End
now move selection, disabled tabs are stepped over, and focus follows the selection.

**3. Skeletons shouted.** Every `Skeleton` carried its own `role="status"` labelled "Loading", so a
placeholder block announced "Loading" once per bar. Individual placeholders are now `aria-hidden`
and a new `SkeletonRegion` makes the one announcement for the group.

**4. `LoadingSpinner` announced an untranslated string, twice.** It hardcoded
`role="status"` with an English "Loading" on every instance, so the one inside `LoadingState` added a
second, English-only live region on top of that component's translated one. It is decorative by
default now; the twelve call sites where a spinner IS the only loading indication pass a translated
label explicitly.

**5. A verification code could be spent twice without the user retyping it.** `OtpCodeInput` calls
`onComplete` whenever the field is full, and the in-flight guard did not catch a re-fire that starts
*after* the first attempt has already failed — so a rejected code was immediately resent, burning a
second of the server's five attempts on input nobody touched. `submit` now refuses to send a code
identical to the last one sent; changing a digit or requesting a new code clears it. This surfaced
only because the new branded verifying state made the second attempt visible.

**6. Two long tenant profile forms saved silently.** The organization and university profile pages
reported failure and said nothing at all on success. Both now show the same success Alert the student
profile already had.

## Shared auth lifecycle component

`AuthStatus` replaces five independently written outcome screens with one vocabulary: tone picks the
mark (`loading` / `success` / `info` / `warning` / `error`), the title states the outcome in words,
and the next actions follow in the order they should be tried. The icon is never the sole carrier of
meaning; `error` and `warning` descriptions are `role="alert"` and `loading` is `aria-live="polite"`,
while `success` stays silent because `AnimatedCheck` already announces itself — announcing twice is
the duplicate-noise problem, not politeness.

Applied to:

| State | Before | Now |
| --- | --- | --- |
| Email verification, in flight | a spinner inside a button the user could no longer see (the code auto-submits on the 4th digit) | branded "Verifying your email" |
| Email verification, success | check + text + a bare link | role-aware next step + a real CTA |
| Verification code expired / locked | a red line under a field that could no longer succeed | recoverable screen: resend + back to sign in |
| Registration to verify | landed cold on a code field | "Your account has been created" confirmation |
| Forgot password, sent | a centred paragraph, no status treatment | `info` tone, deliberately NOT `success` |
| Reset link missing token | an error message used as a page heading | `error` tone + request-a-new-link |
| Reset token expired / invalid | a red line above a form that cannot succeed | recoverable screen |

**Role-aware success copy asserts nothing that has not happened.** The organization and university
branches say the EMAIL is verified and name the next setup step; neither implies the institution has
been verified, and enrollment verification is untouched (CLAUDE.md sections 13 and 27). The role
comes from the query string, so it is not authoritative — but it only selects which next-step
sentence to show, and every branch states the same fact about what was verified.

**Forgot-password is `info`, not `success`, on purpose.** The server answers identically whether or
not the address has an account, so the UI cannot honestly claim an email was sent to anyone. A green
tick would have the interface asserting something the API deliberately refused to say.

## There is no "already verified" screen, and there cannot be one yet

FursadHub verifies email with a 4-digit code, not a clickable link, so "reusing a used link" is
"re-entering a used code". The backend has no distinct answer for it: an account with nothing left to
verify has no active challenge, so `VerifyEmailService` returns
`EMAIL_VERIFICATION_CODE_INVALID` — the same code as a typo. Rendering a confident "you are already
verified" on that response would be a guess presented as a fact.

Instead the inline message now names both possibilities ("That code is not right, or it has already
been used... or sign in if this address is already verified") and a permanent "Already verified this
address? Back to sign in" route sits under the form. Verified live: entering an already-consumed code
produces exactly that state. A truthful dedicated screen needs a backend change (a distinct code for
"no challenge because this address is already verified"), which is out of scope here and is NOT
implemented.

`resend` is likewise silent about already-verified accounts by design, and its 60s cooldown in the UI
matches the server's configured `EMAIL_VERIFICATION_RESEND_COOLDOWN` default — the UI does not invent
a cooldown the server does not enforce.

## Live QA performed

Sessions: student, recruiter, department coordinator, super admin, plus one newly registered student.

- **Registration to code email to verifying to success to next action**: PASS, end to end through MailDev.
- **Re-entering a consumed code**: PASS — honest message plus the sign-in route.
- **Ineligible author**: PASS — a registered student with no profile is told why the form is
  unavailable rather than shown a form that cannot succeed.
- **Route sweep, instrumented for console errors, error boundaries, page overflow and raw
  translation keys**: 11 admin console routes, 8 student routes, 11 university routes, 6 organization
  routes. Every one carries the `route-in` transition; **zero console errors, zero error boundaries,
  zero page overflow, zero raw keys** across all 36.
- **Responsive**: measured inside sized iframes, because `resize_window` reported success but
  `window.innerWidth` never changed in this session. Media queries evaluate against the iframe
  viewport, so this is a real breakpoint test, not a simulation. Home, verify-email,
  forgot-password, reset-password and the moderation queue at 375 / 768 / 1024 / 1366: **0 page
  overflow everywhere**. The moderation table exceeds the viewport at 375 and scrolls inside its own
  container, which is the intended pattern.
- **Dark mode**: the `AuthStatus` error mark resolves to #B42318 on #FFEBE9 in light and #FF9189 on
  #4A211F in dark; testimonial surfaces and stars verified in both.
- **Reduced motion**: verified by rule inspection rather than live emulation (see below) — all five
  duration tokens including the new `--duration-panel` collapse to 1ms under
  `prefers-reduced-motion: reduce`, and the `motion-safe:` / `motion-reduce:` variants compile.
  Loading spinners deliberately keep spinning: the rotation is the message, not decoration.

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — the same six pre-existing warnings, none new |
| `npm run test` | **97 files / 755 tests PASS** (was 96 / 744) |
| `npm run build` | PASS; existing large-chunk warning |
| EN/SO parity, all 20 locale files | 0 differences |
| `git diff --check` | PASS |
| Backend | untouched — 0 files under `apps/api/src` modified in this run |

## Not done, and why

- **Reduced-motion live emulation.** The browser tooling available here exposes no way to set
  `prefers-reduced-motion`, and `resize_window` had no effect on the viewport either. Both are
  reported as verified by rule inspection and unit tests, not by live emulation.
- **A per-page redesign walkthrough of all 52 portal routes.** The work here is shell-level and
  propagates through shared components; the route sweep confirms every route renders cleanly under
  it. Individual page compositions were not re-litigated — the previous pass already did that, and
  redoing it was explicitly out of scope.
- **Toast is still unused.** `Toast` and `ToastViewport` exist and no component renders them.
  Mutation feedback continues to use inline `Alert` and query invalidation. Wiring toasts across 41
  mutation pages is a larger change than this pass should make unannounced; the two silent save
  forms were fixed inline instead.
- **A dedicated already-verified screen.** Blocked on the backend, as described above.

## Local data state

Three testimonials were submitted through the real form (recruiter, coordinator, new student) and
remain `SUBMITTED` in the moderation queue. One was published and then unpublished, so the public
wall holds exactly the two rows it held before this pass. One new student account was registered and
verified through the product's own flow. No row was deleted, rejected, or edited in the database.

Four existing QA account passwords were changed through the product's own password-reset flow, at
the user's explicit instruction.

---

# Experience polish pass — dark-mode redesign and public-site typography — 2026-09-09 (Claude)

Same branch and working tree. Branch `feat/fursadhub-presentation-refresh`, HEAD `d20d00b`. No
reset, clean, checkout, revert, commit, push or merge. **No backend file touched** (0 files under
`apps/api`). No Phase E work. Auth, About, legal and the testimonial work are unchanged.

## Instruction conflict, reported rather than resolved silently

The brief declares `docs/product/BRAND_AND_UI_GUIDELINES.md` **deprecated and non-authoritative**
and forbids using it as a design source for this pass. CLAUDE.md section 57 still instructs the
opposite — that Claude MUST read it before frontend work. This pass followed the brief: the file was
not opened, and visual authority was `design-reference/presentation-refresh-2026`, the current
approved implementation, and the existing shared primitives. **Section 57 and that document need to
be reconciled by the FursadHub team**; nothing here deleted or rewrote either.

## Dark mode redesigned at the token level

Nothing was inverted and no component hard-codes a dark colour — an audit found zero
`dark:bg-[#…]`-style literals, so the whole redesign lives in `tokens.css` and propagates.

**The defect was depth, not legibility.** Every previous pair already cleared AA. The five ground
tones sat at L* 6.2 / 10.5 / 14.8 / 17.1 / 19.0, so the ramp collapsed at the top: an elevated panel
was 2.3 lighter than an inset one and a hover state 1.9 lighter again — under the threshold where a
surface reads as a separate plane. Every card, dialog, dropdown and hovered row was the same navy
rectangle at slightly different opacities.

The new ramp, measured in CIE L*:

| plane | value | L* | step |
| --- | --- | --- | --- |
| rail | `#070f1a` | 4.2 | |
| page | `#0a1422` | 6.2 | +2.0 |
| card | `#141f30` | 11.6 | +5.4 |
| inset / muted | `#1b2839` | 15.7 | +4.2 |
| elevated | `#233246` | 20.4 | +4.6 |
| control hover | `#2b3c53` | 24.9 | +4.5 |

The rail now sits **below** the page rather than above it, so the content ground reads as floating on
the frame — that is what gives the shell its plane order without a shadow. The deepest tones are
pulled slightly off pure navy toward charcoal, because those were the ones reading as flat blue
paint; the brand stays present through headings, the accent and the rail.

Also changed:

- **`--color-border-strong` now clears WCAG 1.4.11.** It is the visible boundary of inputs and
  outline buttons — a UI component boundary, not decoration — and sat at roughly 2:1. It is now
  3.26:1 on a card and 3.64:1 on the page. The quiet hairline stays quiet.
- **Text is soft near-white, not `#fff`**, which buzzes at body sizes on dark ground. Measured on a
  card: 14.8 / 9.5 / 6.9. The muted step is constrained by the TOP of the ramp, where it still holds
  4.67:1.
- **Status colours re-seated** on the new ground: each keeps its hue, each text step clears
  6.4-7.9:1 on its own wash, and each wash separates from the card by lightness as well as hue.
- **Shadows softened.** With a working ramp they no longer have to do the separating, and heavy
  black drop shadows on dark ground read as grime rather than height.
- **The navy public bands got a dark-mode override.** `#061e45` measures L* 11.9 and a dark card
  measures 11.6 — so the home CTA strip and the footer were landing at exactly card lightness and
  reading as slightly bluer rectangles. They now sit at L* 14.7, clearly above the card plane.
- **The two rail treatments converge in dark mode.** A navy rail lit brighter than a dark page would
  invert the plane order the ramp exists to establish; university and platform keep their identity
  through the crest and the orange active edge instead.

The brand anchors `#0B2A5B` and `#F97316` are untouched, the canonical logo colours are untouched,
and the light palette is untouched.

## The public site was shipping 10px reading text

Found by looking at the rendered page, not the code. At desktop widths a media block in `index.css`
forced the featured-card metadata, every line of "How FursadHub Works", the testimonial lead and the
entire footer to **10px on a 12-14px line-height**, and section headings to 14px. Under 1280px it was
barely better — the components themselves set 11px. The flagship page's reading text was smaller
than any control sitting next to it.

The cause was a category error from an earlier pass: reference 01's proportions were matched by
shrinking type. A mockup rendered at screenshot scale is not a type scale.

Fixed by moving the density onto the lever that actually carries it — vertical rhythm:

- `#how-it-works`: heading 14px → 28px, body and bullets 10-11px → 14px/24px, card padding 14px →
  24px, and section padding opened up. The composition (one centred heading over three parallel
  audience columns) is unchanged.
- `InternshipCard` `compact`: title 12px → 14px, metadata 11px → 12px, organization name 12px → 13px,
  padding 14px → 16px. `compact` is meant to be narrower and tighter than `comfortable` — not smaller
  type — and the comfortable variant's 17px title is untouched.
- The `@media (min-width: 1280px)` block keeps its spacing rules and has lost every font-size
  override.
- The hero's "Popular:" shortcut row: 10px → 12px with taller chips. These are tappable links into
  the marketplace, and they were both the smallest text on the page and a target barely taller than
  the finger meant to hit it.

After the change the whole home page contains **zero** elements under 11px at any of 375 / 768 /
1024 / 1366.

## Composition fixes, both the same failure

Two surfaces packed a small real dataset into a grid sized for a large one, which reads as content
that failed to load rather than as content there is little of.

1. **Top verified organizations** — three partners as small chips at the far left of a full-width
   bar. Now centred with room to breathe, which stays correct when the row is full and wraps.
2. **Public universities directory** — `xl:grid-cols-6`, so the pilot's two universities rendered as
   two 195px cards against two thirds of empty row. Now four columns at the widest, and a short row
   is centred and capped: the two cards are 374px wide in a 768px row. Same rule the testimonial wall
   already uses.

## Two smaller ones

- **The home CTA band** was closing the page at a 16px heading over 12px body in 16px of padding — a
  strip thinner than the cards above it, with its skyline artwork invisible. Sized properly, with a
  left-to-right navy scrim so the copy sits on solid ground while the artwork comes through on the
  side with no text over it.
- **Organization covers are framed.** Organizations upload whatever they have, and a logo on a white
  ground — most of them — butted straight against the page with no edge, reading as a hole punched
  in the layout. A hairline and a muted backing give any image, transparent ones included, a boundary
  in both themes.

## Tests added

`tests/design-system/darkTheme.test.ts`, 16 tests that parse `tokens.css` and assert the design
contract rather than the hex values — retuning the palette stays free, letting it regress does not:

- the ramp rises monotonically from rail to control, and every step from the card upward is at least
  3.5 L* (the exact failure that made the old theme flat);
- the ground is not black and the rail-to-control range is wide enough to work with;
- primary, secondary and muted text each clear 4.5:1 on **every** ground tone including the topmost
  interactive one; links and orange ink clear 4.5:1 on a card;
- `border-strong` holds the 3:1 WCAG 1.4.11 floor;
- each status colour is legible on its own wash;
- the dark block never restates a brand anchor, and the light values are exactly `#0b2a5b` /
  `#f97316`;
- every duration token collapses to 1ms under `prefers-reduced-motion`.

No animation-timing tests were written.

## Browser QA

Dark mode inspected page by page, not inferred: Home (hero, featured, organizations, how-it-works,
CTA band, testimonials, footer), Internships, Internship Detail, Organizations, Universities,
Student Dashboard, University Verification Queue. Light mode re-checked on Home after every
typography change to confirm no regression. The live ramp was measured in the browser: rail
`rgb(7,15,26)` under page `rgb(10,20,34)`, with card / inset / elevated / hover resolving to the new
tokens.

Responsive measured inside sized iframes — `resize_window` reports success but never changes
`window.innerWidth` in this environment, whereas media queries do evaluate against an iframe
viewport. Home at 375 / 768 / 1024 / 1366 in dark: **0 page overflow, 0 raw translation keys, 0
elements under 11px** at every width.

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — the same six pre-existing warnings, none new |
| `npm run test` | **771 tests PASS** (was 755) |
| `npm run build` | PASS; existing large-chunk warning |
| EN/SO parity, all 20 locale files | 0 differences |
| `git diff --check` | PASS |
| Backend | untouched — 0 files under `apps/api` |

## Not done, and why

- **Reduced-motion and viewport emulation remain unavailable** in this tooling, so both are covered
  by rule inspection and unit tests rather than by live emulation. Unchanged from the previous pass.
- **The motion system was not rebuilt.** It was built in the previous pass to the same spec this
  brief restates (fast 150 / normal 240 / panel 280, one easing set, content-only route transition,
  no geometry-moving hovers) and was verified again rather than redone. A scan confirms zero
  `hover:scale` and zero `hover:translate` anywhere in the codebase.
- **Per-route portal recomposition was not attempted.** The dark redesign is token-level and reaches
  every route; individual portal page layouts were reviewed in the browser but not rearranged, which
  the brief explicitly did not want.
- **`Toast` is still unused**, as reported last pass.
- **One honest oddity left alone**: the student dashboard's "Saved internships" tile shows an em-dash
  while its count is unresolved, next to three tiles showing 0. It looks like the odd one out, but
  it is refusing to claim a number it does not have, and this brief forbids inventing counts.

## Deviation from a previous approved decision

The "Reference 01 desktop density" typography — approved in an earlier pass — has been reversed.
The spacing intent is preserved; the font-size shrinking is gone. This is a deliberate, reported
deviation, on the grounds that 10px reading text fails the comfort and premium goals this brief sets
out. If the FursadHub team wants the literal mockup proportions back, that decision should be taken
knowing what it costs.

---

# Product experience + access-control pass — 2026-09-09 (Claude)

Same branch and working tree. Branch `feat/fursadhub-presentation-refresh`, HEAD `d20d00b`. No
reset, clean, checkout, revert, commit, push or merge. No Phase E work. Dark mode, testimonials and
the auth lifecycle are preserved.

## The critical security rule was already satisfied

The brief treats Department Coordinator scoping as an unimplemented requirement. It is not: the
audit found it **already correct at the query level**, and the work here was to prove it rather than
to build it.

- `VerificationQueryService.scopedEnrollments` requires membership, and for a coordinator reads the
  **actual assigned department set** — plural, honouring the real model — and queries only those
  departments. Both the students list and the verification queue go through it.
- `caseDetail` calls `requireDepartmentScope` on the enrollment's own department, so a direct id is
  refused rather than filtered client-side.
- `NominationQueryService.listEligibleStudents` applies the same assigned-department set to the
  nomination shortlist.
- A `departmentId` filter is not a bypass: it is checked against scope before it is used.

The same holds on the organization side. `CandidacyAuthorization` walks
`candidacy -> opportunity's organization -> current membership` on every call, and deliberately
**excludes `ORGANIZATION_SUPERVISOR`** from the candidate pool. There is no "get any student" route
anywhere in the API — a professional profile is only reachable through a candidacy the caller's
organization owns, a verification case inside the caller's department scope, or a nomination
shortlist scoped the same way.

## What was actually missing, and was added

`StudentProfileAccessIT` — 10 integration tests, all passing, pinning the shape above so a future
convenience endpoint cannot quietly become a student directory:

| Case | Expected |
| --- | --- |
| recruiter + own applicant's candidacy | ALLOW, and the professional profile is present |
| recruiter + another organization's candidacy id | 403 `ACCESS_DENIED` |
| recruiter + another organization's candidate list | 403 |
| organization supervisor + own organization's candidate list | 403 |
| coordinator nomination shortlist | own department only |
| coordinator students list | own department only |
| coordinator + `?departmentId=` another department | 403 |
| university admin + own university / another university | ALLOW / 403 |
| university supervisor + students list | 403 |
| shortlist row contents | professional profile present; **no** CV, no evidence keys |

The last row is the one that keeps the three concepts apart:
`professional profile != application CV != student-ID evidence`.

**One backend addition.** `EligibleStudentRow` / `EligibleStudentResponse` now carry the student's
professional profile, so a nominator can read who they are putting forward instead of choosing a
name from a dropdown. It rides the authorization that already existed — `listEligibleStudents` has
already scoped the row to the caller's university and assigned departments before the profile is
attached — and is null for a student who has not written one. No migration, no schema change, and
no other backend domain touched (3 backend files in total, one of them the new test).

## Authenticated public header

**Before:** a large navy "My portal" button with an avatar, for every signed-in role.

**After:** a compact identity control — avatar, name, and truthful derived context — opening a menu.

Verified live against three real sessions:

| Session | Trigger reads |
| --- | --- |
| `acc.student` | `acc.student` / **Student** |
| `acc.recruiter` | `acc.recruiter` / **Recruiter · Acceptance Test Company** |
| `acc.coordinator` | `acc.coordinator` / **Department Coordinator · Acceptance Test University** |

"My portal" appears nowhere in the DOM in any of them, and the anonymous header keeps Sign in /
Get Started unchanged.

Context comes from `useAccountContext`, which probes the same three membership lookups
`resolveConsolePath` already used and resolves the tenant's public name — so the label and the
destination cannot disagree. **What it never shows:** the full email address, membership ids, tenant
ids or department ids. This control sits on a public page where someone else can be looking at the
screen. The name printed is the local part of the address, because `/me` carries no display name
today; if it gains one, that is the single line that changes. No tenant switcher is offered, because
the product does not support switching.

Role wording is now one shared `common:roles` map, promoted out of `common:testimonials.roles` and
read by both the account menu and testimonial attribution — so a recruiter is worded identically
under their quote and under their own name.

## Verified enrollment

It used to remain a submission screen with a green tick appended: same status row, same details
panel, same shape as the page that had been asking for a document. Nothing said *finished*.

Now an early return replaces the whole screen — which is what structurally guarantees no upload,
submit or resubmit affordance can reach a student who has nothing left to do. The outcome leads,
then the four real workflow points shown complete (claim, evidence, review, verified), then next
actions that are existing routes only.

**Only real data.** University and department names are resolved from the ids the enrollment
carries, and a failed lookup drops the row rather than printing a placeholder. **No verification
date is shown** — `StudentEnrollmentResponse` does not expose one, and "verified today" derived from
page load would be a fabrication. The copy says the university confirmed this student's *enrollment*
and explicitly separates that from account and institution verification.

## Public scroll motion

`<Reveal>` — IntersectionObserver plus a CSS transition, no dependency added. Opacity and a 14px
translate over 500ms, capped stagger (60ms per child, never more than 240ms total).

Three properties it was built to hold, each covered by a test:

- **It cannot hide content.** The element is in the DOM and the accessibility tree from first paint;
  only opacity and transform change. With no IntersectionObserver it starts visible — it degrades to
  shown, never to hidden.
- **Reveal-once.** The observer disconnects on first intersection, so scrolling back does not replay
  and a section near the fold does not flicker as the page settles.
- **No layout shift.** Transform resolves to `none`, both properties are on the compositor, and the
  entrance translate is never used as a hover effect.

Under `prefers-reduced-motion` the final state is painted outright with no transition and no delay.

Applied with variation rather than mechanically: featured cards stagger, the organization strip
arrives as one bar, the three audience columns arrive in sequence, testimonial cards stagger, and
the CTA band arrives as a single closing piece. The public header also gains a scrolled state —
border and shadow only, with height and every control position identical, so navigation cannot jump.

## CLAUDE.md reconciliation

Section 57 said "Claude MUST read `docs/product/BRAND_AND_UI_GUIDELINES.md`". It now names the
canonical authority — `design-reference/presentation-refresh-2026`, the current implementation, the
approved references, the shared tokens/primitives — and marks that file DEPRECATED and
NON-AUTHORITATIVE. Section 8's "Read:" pointer and section 58's motion pointer were redirected the
same way. The file itself was not deleted or rewritten. It was not read during this pass.

## Verification

| Check | Result |
| --- | --- |
| `StudentProfileAccessIT` | **10 PASS** |
| Targeted authorization suites (`NominationIT`, `CandidacyAccessIT`, `StudentIdEvidenceIT`, `ApplicationCvIT`, `TenantAdminProtectionIT`) | **44 PASS** |
| `mvnw -o test` (surefire suite) | **903 PASS**, BUILD SUCCESS — see the pre-commit audit: this is the surefire suite, NOT CI's `mvn verify` |
| `npm run typecheck` / `lint` / `build` | PASS (same six pre-existing warnings) |
| `npm run test` | **784 PASS** (was 771) |
| EN/SO parity, 20 locale files | 0 differences |
| `git diff --check` | PASS |
| Responsive (iframe-measured) 375 / 768 / 1024 / 1366 | 0 overflow, 0 raw keys |
| Console errors across the live QA | 0 |

## A pre-existing failure found, reported, NOT fixed

`VerificationChallengeIT` has 4 errors when run explicitly: its fixture submits enrollment
verification without uploading student-ID evidence, and a previous pass added the
`STUDENT_ID_EVIDENCE_REQUIRED` gate. The test file is unmodified since HEAD and this pass touched
neither enrollment submission nor that test — it is a stale fixture, not a regression.

It does not surface in `mvnw test` because `*IT` classes are bound to failsafe; it appears only when
selected with `-Dtest=`. Fixing it needs the `uploadEvidence` helper, which lives on a different
abstract IT base, so the fix is a helper move in an unrelated module — outside this pass's scope and
left for the team to schedule.

## Not done

- **Three distinct portal personalities (brief sections 8-12).** Not implemented. The portals share
  one shell and already differ by rail treatment and navigation; giving Student / Organization /
  University genuinely distinct presentation families is a substantial design pass, and doing it
  badly at the end of a long session would be worse than not doing it. **This is the largest
  unaddressed item in the brief.**
- **Recruiter candidate-detail presentation** was verified as already rendering the professional
  profile through `ProfessionalProfileSummary`; it was not redesigned.
- **Reduced-motion live emulation and window resizing** remain unavailable in this tooling, as in
  previous passes. Both are covered by rule inspection, unit tests and iframe measurement.

## Local data state

No product data was created, deleted or moved. Sessions used the existing QA accounts whose
passwords were rotated through the product's own reset flow in an earlier pass.

---

# Two-gap closure — workspace families and public detail motion — 2026-09-09 (Claude)

Same branch and working tree. Branch `feat/fursadhub-presentation-refresh`, HEAD `d20d00b`. No
reset, clean, checkout, revert, commit, push or merge. No Phase E work. **0 backend files touched.**
The deprecated brand guide was not read.

## Gap 1 — workspace families

**Architecture: one data attribute and five custom properties.** `AppShell` stamps
`data-workspace` on its root and publishes the same value on `WorkspaceContext`. A small block in
`index.css` resolves five properties per family, and the shared primitives read them. That is the
whole mechanism.

Chosen over the alternatives because of what it avoids: no prop threaded through every page, no
`StudentCard` / `OrganizationCard` / `UniversityCard` to keep in sync, and adding a family later is
one CSS block. The context exists only for the cases that need the value in JavaScript — today, the
tests that assert an area got the family it should.

| | page rhythm | module gap | corner | rule |
| --- | --- | --- | --- | --- |
| student | 2rem | 1.5rem | 1.25rem | orange 32% |
| university | 1.75rem | 1.25rem | 0.75rem | navy 30% |
| organization | 1.25rem | 1rem | 0.75rem | neutral strong |
| neutral (`/account`) | 1.5rem | 1.25rem | 1rem | plain border |

Read by `PageContainer` (vertical rhythm), `PageHeader` (the rule under every page title), `Card`
(corner) and `SectionHeading` (panel rule), plus a 3% brand wash on the content ground.

**The differences are functional, not decorative.** A student is reading their own progress, so the
page breathes and modules sit further apart. A recruiter is working a queue, so the same page is
tighter and the rules are crisper — more of the pipeline on screen, and a neutral rule that does not
compete with the status colour they are actually scanning for. A university reviews in order, so the
composition is squarer and more formal, between the other two on density.

**Still unmistakably one product.** No family block may define anything but a `--workspace-*`
property, and none redefines a brand anchor — both asserted in
`tests/app/layouts/WorkspaceFamily.test.tsx`. `#0B2A5B` and `#F97316` are untouched, as is the type
scale, the component set and both colour themes. There is no student blue, organization black or
university purple.

**Dark mode.** Rhythm, corner and rule all carry over; the ground wash is dropped, because the
elevation ramp already establishes the plane order and a tint over navy reads as grime. Verified
live in all three workspaces.

**What the live comparison shows** (dark, 1366px, all three dashboards):

- **Student** — warm orange hairline under "Welcome back", roomiest rhythm, softest corners, and a
  journey framing: profile panel, "My internship", recent applications.
- **Organization** — crisp neutral rule under "Recruitment overview", tightest rhythm, squarest
  corners, four stat tiles across the full width, then "Needs your attention" / "Live offers" /
  "Candidate pipeline".
- **University** — navy rule under "University overview", medium rhythm, institutional crest and
  "UNIVERSITY PORTAL" in the rail, then ordered queues: nominations, placements by status,
  enrollment verification.

**Not done inside this gap:** the dashboards' module hierarchy was reviewed and already differs
per role — the family work did not rewrite any of them, and no dashboard content changed. What was
added is the presentation layer that makes the difference legible at a glance.

## Gap 2 — public detail motion

All three detail pages now compose with the existing `<Reveal>`. Grouping and timing vary; the
motion language does not.

- **Internship** — identity and key facts arrive as one piece, body sections as the second beat,
  Similar Internships as its own group on scroll. The most energetic of the three.
- **Organization** — About, then facts, then openings, each a beat apart: employer-brand confidence,
  identity instant and supporting content following in order.
- **University** — About, facts panel, then the verification note, one clear beat between each. The
  calmest sequence.

**Two things are deliberately never wrapped, and both are pinned by tests:**

1. **The internship apply rail.** `position: sticky` resolves against the nearest transformed
   ancestor, not the viewport — wrapping the rail, or anything above it, would silently turn the
   sticky column into a static one, and the symptom looks nothing like the cause. Verified live:
   `asidePosition: sticky` with zero transformed ancestors, and the rail renders fully while the
   article beside it is still fading in.
2. **The overlapping crest/logo over the cover** on both profile pages. Animating that composition
   makes the mark visibly slide across the banner on every load.

`Reveal` gained explicit `id` and `aria-label`/`aria-labelledby` passthrough for wrapped
`section` elements — explicit rather than a prop spread, so a caller cannot overwrite the
`className`, `style` or `ref` the reveal depends on.

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — the same six pre-existing warnings |
| `npm run test` | **802 PASS** (was 784) |
| `npm run build` | PASS |
| EN/SO parity, 20 locale files | 0 differences |
| `git diff --check` | PASS |
| Backend | untouched — 0 files under `apps/api/src` |
| Console errors across the live QA | 0 |
| Responsive, detail pages at 375 / 1366 | 0 overflow |

18 tests added: 12 pinning the family system (attribute and context agree, every `AppShell` in a
layout gets the same family including the pre-membership branch, the rhythm ordering, three distinct
rules, no brand anchor redefined) and 6 pinning the detail-page reveals including both
never-wrap constraints.

## Not done

- **Reduced-motion live emulation** remains unavailable in this tooling. The contract is covered by
  the existing `Reveal` and dark-theme tests and by the CSS rule that paints the final state
  outright under `prefers-reduced-motion`. Reported as rule-and-test coverage, not as live
  emulation — it was not performed.
- **Per-route personality tuning beyond the shared layer.** The families reach every route through
  the shared primitives; individual workflow pages were reviewed live but not individually
  restyled, which is what the brief asked for.

---

# Pre-commit audit — third stale fixture, and an INCOMPLETE CI gate — 2026-09-09/10 (Claude)

Branch `feat/fursadhub-presentation-refresh`, HEAD still `d20d00b`. **No commit was made.** Nothing
was staged. No reset, clean, checkout, revert, push or merge. Phase E not started.

## The third stale fixture

`UniversityVerificationAuthorizationIT` was pristine at HEAD and erroring on setup in four tests:

```
consumedChallengeCannotBeReplayed:163->claimAndSubmit:222
coordinatorCannotReviewCaseOutsideAssignedDepartment:79->claimAndSubmit:222
expiredChallengeIsRejected:141->claimAndSubmit:222
verifiedCaseCannotBeVerifiedAgain:188->claimAndSubmit:222
  IllegalState Verification submit failed: {code=STUDENT_ID_EVIDENCE_REQUIRED, ...}
```

Same class of breakage as `OrganizationVerificationIntakeIT` and `VerificationChallengeIT`: a
production rule added on this branch — Student-ID evidence is mandatory before a verification
submission — invalidated a fixture written before it. The fixture, not the rule, was wrong.

`claimAndSubmit` now uploads a real PDF to `/api/v1/students/me/verification/evidence` between the
claim and the submit. Nothing about the rule was relaxed. 8/8 PASS in isolation.

The evidence upload is written locally rather than inherited. This class sits directly on
`AbstractIdentityIT` and declares its own private `authorizedGet` / `authorizedPost` /
`insertVerifiedUniversity` / `insertDepartment` / `userIdOf`, all of which `AbstractPhase4IT`
declares as **protected** further down the chain. Re-parenting onto `AbstractPhase7IT` to reach one
upload helper makes five methods fail to compile on weaker access — a large, pointless diff for a
class whose four assertions are the point.

**Why this one mattered most:** `coordinatorCannotReviewCaseOutsideAssignedDepartment` is a
Department Coordinator scoping test — CLAUDE.md section 60, and a stated security requirement of
this branch. It was erroring during setup, so it had been proving nothing. It now runs and asserts
`403 ACCESS_DENIED` exactly. The other three assert their exact codes too
(`VERIFICATION_CHALLENGE_EXPIRED`, `VERIFICATION_CHALLENGE_INVALID`,
`VERIFICATION_CASE_ALREADY_RESOLVED`) — not a generic 4xx.

## Gate status: INCOMPLETE — not green, not red

`./mvnw -B verify` from the current working tree was **killed by the system for low memory** shortly
after entering the failsafe phase (29 surefire classes done, 1 IT class done, 0 failures at the point
of death). That is not a test result. It is not evidence of success and was not treated as any.

The commit is therefore **not** made. The audit's remaining steps — staging, staged-diff inspection,
the checkpoint commit — are deliberately not started, per instruction.

Known-good from isolated runs on the current tree, none of which substitutes for the full gate:

| Class | Result |
| --- | --- |
| `UniversityVerificationAuthorizationIT` | 8/8 PASS |
| `OrganizationVerificationIntakeIT` | 11/11 PASS (previous run) |
| `VerificationChallengeIT` | 5/5 PASS (previous run) |
| Surefire (unit) total, previous complete run | 903 PASS, 0 failures |

## Frontend

`npm run typecheck`, `npm run lint` (six pre-existing warnings) and `npm run build` all PASS. EN/SO
parity across 16 locale pairs: 0 differences. `git diff --check`: clean.

`npm run test` could **not** be certified green on this machine. Four full-suite runs produced
12, 11, 16 and 2 failures — a different set every time, every one a `userEvent`/`findByRole` timeout,
and every failing file passing in isolation (`LoginPage` + `RegisterPage` 10/10, `StaffIdentity` 14/14,
`CandidatePoolPage` + `StaffIdentity` 23/23). Reducing parallelism to `--maxWorkers=2` took the
failure count from 16 to 2, which is the signature of CPU starvation, not a regression: the box is
running Docker/WSL alongside 102 test files at default parallelism, and `findByRole`'s 1s default
deadline is the first thing to break.

Recorded as **flaky on this machine, cause understood, not certified**. It is not recorded as a pass.
