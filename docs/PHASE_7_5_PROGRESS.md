# Phase 7.5 — Institution Onboarding & License Verification Evidence

Work tracking for the phase. Plan of record: institution license evidence + university
self-registration + landing/registration frontend redesign.

Status legend: `TODO` · `IN PROGRESS` · `DONE` · `BLOCKED`

---

## Backend

### Shared groundwork (done before parallel work started)

| Item | Status | Notes |
| --- | --- | --- |
| `FileClassification`: add `ORGANIZATION_VERIFICATION_EVIDENCE` + `UNIVERSITY_VERIFICATION_EVIDENCE` | DONE | PDF-only, 10MB, `RetentionCategory.VERIFICATION_EVIDENCE`; own error codes |
| Flyway `V38__institution_verification_evidence.sql` | DONE | Evidence columns on `organizations` + `universities`; university profile columns; backfills `verified_at` for the seeded pilot row |

The three tracks below were dispatched to parallel agents with disjoint file ownership. Shared
files (`FileClassification`, V38) were settled first so no track races on them.

### Track A — Organization evidence — DONE (integration tests unrun, see Verification)

| Item | Status | Notes |
| --- | --- | --- |
| `Organization`: `evidenceStoredFileId` / `evidenceUploadedAt` / `attachEvidence()` | DONE | Mirrors `StudentVerificationCase.attachEvidence` |
| `Organization.submitForVerification()` blocks without evidence | DONE | `ORGANIZATION_VERIFICATION_EVIDENCE_REQUIRED` (409), checked before the state check |
| `OrganizationVerificationEvidenceService` (upload / open own / open for reviewer) | DONE | Audits `ORGANIZATION_VERIFICATION_EVIDENCE_UPLOADED`; `..._MISSING` (404) when absent |
| `OrganizationController` evidence endpoints (multipart upload + document download) | DONE | Upload = ORGANIZATION_ADMIN only; download = any active member |
| Admin evidence download on `AdminOrganizationController` | DONE | `GET /api/v1/admin/organizations/{id}/verification/evidence/document` |
| `OrganizationVerificationResponse` + `OrganizationResponse` gain `hasEvidence` / `evidenceUploadedAt` | DONE | Frontend needs this to resume the setup wizard after reload — add to `features/organization/types/index.ts` |
| Domain unit tests (`OrganizationTest`) | DONE | 9/9 passing |
| Integration tests (`OrganizationVerificationEvidenceIT`, 10 tests) | WRITTEN, UNRUN | Docker not running — Testcontainers could not start PostgreSQL |

### Track B — University self-registration — IN PROGRESS

| Item | Status | Notes |
| --- | --- | --- |
| `University`: `register()` factory + full transition methods + evidence fields | IN PROGRESS | Entity is currently read-only from Java |
| `CreateUniversityService` (+ founding `UNIVERSITY_ADMIN` membership) | IN PROGRESS | Mirrors `CreateOrganizationService` |
| `UniversityVerificationEvidenceService` | IN PROGRESS | |
| `UniversityController` becomes writable (register / submit / evidence) | IN PROGRESS | Must not disturb the existing PUBLIC `GET /universities` |
| `AdminUniversityController` + `AdminUniversityVerificationService` | IN PROGRESS | Removes the "universities are not reviewable" exclusion |
| `UniversityRepository` gains `save` / `existsBySlug` / `search` / `countByStatus` | IN PROGRESS | |
| University notification types + EN/SO keys | IN PROGRESS | Shared file — Track B owns it |
| Integration tests | IN PROGRESS | Register → evidence → submit → admin verify → targetable |

### Track C — Pre-existing test-coverage gaps — DONE (35 tests, all passing)

Correction to this track's original premise: the `verification`/`student` *packages* had no test
files, but three of the four §60 items were already covered from
`university/UniversityVerificationAuthorizationIT.java` (expired challenge, consumed-challenge
replay, `VERIFICATION_CASE_ALREADY_RESOLVED`). Those were **not** duplicated. "Unverified student
cannot apply/be nominated" was likewise already covered in `candidacy/SelfApplicationIT.java:37`
and `candidacy/NominationIT.java:113`.

| Item | Status | Notes |
| --- | --- | --- |
| `verification/domain/VerificationChallengeTest` (6) + `StudentVerificationCaseTest` (8) | DONE | Pins the predicates the services actually gate on |
| `student/domain/StudentEnrollmentTest` (11) | DONE | |
| `student/StudentEnrollmentConstraintIT` (5) | DONE | **The genuine gap.** The pre-existing duplicate test only exercised the Java pre-check and would still pass if the DB constraint were dropped; this writes via `JdbcTemplate` to prove `uk_student_enrollments_university_student_number` exists and is university-scoped (CLAUDE.md §52) |
| `verification/VerificationChallengeIT` (5) | DONE | Challenge issued for case A rejected against case B and left unconsumed; no challenge once resolved/before submission; only the SHA-256 hash is persisted, never the raw code |
| Full run | DONE | 25 surefire + 10 failsafe, 0 failures, against real Testcontainers PostgreSQL. No `src/main/` file touched. |

---

## Frontend — DONE (lint/typecheck/build all clean; no browser walkthrough yet)

Backend unit tests passed (144/144) before this started; the blocked `*IT` suite (Docker) was not
a gate for frontend work per the user's explicit direction to proceed.

| Item | Status | Notes |
| --- | --- | --- |
| Provisional typography tokens (`--font-display` / `--font-body`) | DONE | Manrope (display) + Public Sans (body), Google Fonts import moved to the top of `index.css` (an `@import` must be the stylesheet's first statement — nesting it in `tokens.css`, itself `@import`-ed after Tailwind, silently dropped it; caught by the build's own CSS-order warning) |
| Landing page redesign — three role "door" cards | DONE | `app/pages/HomePage.tsx`, replacing the Phase 0 placeholder; hero fade-in respects `prefers-reduced-motion` via the existing token collapse + explicit `motion-reduce:animate-none` |
| Role-aware registration (`?role=` threading + post-login routing) | DONE | `RegisterPage`/`VerifyEmailPage`/`LoginPage` thread `?role=student\|organization\|university`; `features/auth/roleRedirect.ts` maps role → post-login landing path |
| Terms & conditions checkbox gate on registration | DONE | Checkbox sources current docs from public `GET /legal-documents`, only when `requiresAcceptance`; ids handed off via `sessionStorage` (`features/legal/pendingAcceptance.ts`) and submitted through the real authenticated `POST /me/terms-acceptances` right after first sign-in — `TermsAcceptanceGate` untouched, remains the fallback |
| `UniversitySetupPage` + `UniversityAreaLayout` inline setup | DONE | Exact mirror of `OrganizationAreaLayout`'s "no membership → show setup page" pattern |
| `UniversityProfilePage` (update + evidence upload + submit) | DONE | Mirrors `organization/pages/ProfilePage.tsx`; submit disabled until `hasEvidence` |
| `OrganizationProfilePage` license upload step | DONE | Deviated from the plan's literal "OrganizationSetupPage" target — the working submit-for-verification button already lives in `ProfilePage`, not the one-time setup form, so the upload step was added there instead |
| `AdminUniversitiesPage` + evidence viewer on `AdminOrganizationsPage` | DONE | Both admin pages gained a "View license" button wired to the reviewer-only download endpoints; `adminApi.ts`'s three near-identical blob-download functions were consolidated into one shared `downloadBlob` helper |
| EN/SO translations for all of the above | DONE | New `common:landing.*`, `auth:register.roles.*`/`acceptTerms*`, `organization:profile.evidence.*`, `university:setup.*`/`profile.*`, `admin:universities.*` in both languages |

---

## Verification

| Check | Status | Notes |
| --- | --- | --- |
| `mvnw test` (unit only, no DB) | DONE | 144/144 passing, 0 failures — includes `UniversityTest` (10), the Track C domain tests, `OrganizationTest` (9) |
| `mvnw verify` (`*IT`, Testcontainers) | BLOCKED | `docker.exe` cannot reach the daemon's named pipe (`dockerDesktopLinuxEngine`) from this shell — `FoundationInfrastructureIT` fails with `IllegalState: Could not find a valid Docker environment`, which cascades `ExceptionInInitializer`/`NoClassDefFound` through every other `*IT` class sharing that static container fixture. Every code review (Track A, Track B, the V38 fix) passed by reading, not by this run — **database-backed correctness is currently unverified**, including whether the `stored_files` constraint fix actually resolves the upload 500. Re-run `mvnw verify` once Docker is reachable from a build shell. |
| Flyway applies cleanly to a fresh database | BLOCKED | Same as above — only provable via `mvnw verify` |
| `npm run typecheck` | DONE | 0 errors |
| `npm run lint` (oxlint) | DONE | 0 errors; a handful of pre-existing warnings in files this phase didn't touch |
| `npm run build` | DONE | 0 errors; caught and fixed one real CSS `@import`-ordering bug along the way (see Findings) |
| Browser walkthrough — all three registration paths end to end | TODO | Nothing has been run in an actual browser yet — the frontend is compile/build-clean, not behavior-verified |

---

## Findings

### `stored_files` CHECK constraint not extended for the new classifications (introduced here, fixed)

The shared groundwork added `ORGANIZATION_VERIFICATION_EVIDENCE` and
`UNIVERSITY_VERIFICATION_EVIDENCE` to the `FileClassification` enum but did not extend
`ck_stored_files_classification`, which enumerates the permitted values in the database
(`V28__stored_files.sql:27`, last extended by `V32__file_platform.sql:33`). Every license upload —
organization *and* university — therefore failed with:

```
ERROR: new row for relation "stored_files" violates check constraint "ck_stored_files_classification"
```

surfacing as an opaque 500 at
`POST /api/v1/{organizations,universities}/{id}/verification/evidence`. It accounted for 8 of the 9
errors in `UniversitySelfRegistrationIT` and would have failed all 10 of Track A's
`OrganizationVerificationEvidenceIT` tests, which had not been run.

Fixed in V38 by extending the constraint, following V32's drop-and-recreate pattern. Worth noting
the constraint did its job: the invariant was enforced at the database rather than trusted to the
Java call sites, which is exactly what CLAUDE.md §52 asks for.

### Missing pessimistic lock on verification-challenge consumption (pre-existing, not introduced here)

`verification/application/ConsumeVerificationChallengeService.java:65-76` reads the challenge with a
plain `findByVerificationCaseIdAndCodeHash`, checks `isConsumed()`, then consumes and saves. Under
READ COMMITTED with no row lock, two concurrent consumes of the same code can both observe
`consumed_at IS NULL` and both succeed — the single-use guarantee holds sequentially but not
concurrently. CLAUDE.md §29 requires consumption be "performed safely/transactionally".

Every analogous one-time-token path in this codebase *does* lock:
`JpaRefreshTokenRepository.findByTokenHashForUpdate` and `JpaInternshipOfferRepository.findByIdForUpdate`
both use `@Lock(PESSIMISTIC_WRITE)`, the latter citing CLAUDE.md §38/54.
`JpaVerificationChallengeRepository` has no equivalent.

**Not fixed** — Track C was scoped to tests only, and this is outside Phase 7.5's scope. Practical
impact is currently low: `consume()` only stamps the row and writes an audit event, it does not
itself advance the case status, and both racers must already be scoped staff at the right
university/department. Suggested fix, if the team agrees: add a `@Lock(PESSIMISTIC_WRITE)` finder
mirroring the refresh-token one. **Decision needed from the FursadHub team.**

## Decisions & open risks

- Evidence lives **on the tenant row**, not in a separate case entity — institution verification
  status already does; the student equivalent differs because a case is decoupled from enrollment.
- The "first gate" is enforced at `submitForVerification()`, not at registration `POST`, so
  registration stays JSON and the upload stays multipart. The frontend presents them as one wizard.
- The frozen `InstitutionVerificationStatus` state machine is **unchanged** — evidence is additive
  metadata only.
- Typography is a **provisional** token choice pending FursadHub team confirmation
  (`docs/product/BRAND_AND_UI_GUIDELINES.md` §24 reserves this decision).
