# FursadHub Claude Code Implementation Phases

This document defines the controlled implementation sequence.

Before every phase Claude Code MUST:

1. read `/CLAUDE.md`
2. read `docs/architecture/REPOSITORY_STRUCTURE.md`
3. read `docs/product/BRAND_AND_UI_GUIDELINES.md` when frontend work is involved
4. inspect the existing repository
5. implement ONLY the explicitly requested phase
6. test it
7. report results
8. STOP

Do not automatically continue into another phase.

---

# Required Phase Report

After each phase report:

## Completed
What was implemented.

## Backend
Controllers, DTOs, use cases, domain logic, persistence, authorization.

## Frontend
Routes, pages, components, forms, queries/mutations, translations, design-system work.

## Database
Flyway migrations, constraints, indexes.

## Security
Authentication, authorization, sensitive data, abuse prevention, security tests.

## Brand / UX
Design tokens, components, motion, accessibility, responsive work, unresolved brand values.

## Tests
Unit, integration, E2E, commands run, results.

## Files Changed
Major created/modified files.

## Known Limitations
Anything intentionally deferred.

## Next Recommended Phase
Name only. Do not implement it.

---

# PHASE 0 — ENGINEERING FOUNDATION

## Goal

Create the production engineering foundation.

Do NOT implement the real authentication business flow yet.

## Repository

Establish/preserve:

```text
apps/api
apps/web
e2e
infra
docs
scripts
.github
```

Use the target structure in `docs/architecture/REPOSITORY_STRUCTURE.md`.

Do not create fake empty domain classes just to populate future packages.

## Backend foundation

Configure:

- Java 21
- Spring Boot
- Maven Wrapper
- Spring Web
- Spring Security
- Spring Security OAuth2 Resource Server dependency
- Spring Data JPA
- PostgreSQL driver
- Flyway
- Bean Validation
- Spring Boot Actuator
- Springdoc OpenAPI
- standard API error foundation
- request/correlation ID foundation
- safe logging foundation

Profiles:

```text
local
test
staging
production
```

Files:

```text
application.yml
application-local.yml
application-test.yml
application-staging.yml
application-production.yml
```

Prepare configuration keys for future auth without creating real production keys:

```text
JWT_PRIVATE_KEY
JWT_PUBLIC_KEY
JWT_ISSUER
JWT_AUDIENCE
JWT_ACCESS_TOKEN_TTL
```

## Frontend foundation

Configure:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- React Hook Form
- Zod
- react-i18next or equivalent
- Vitest
- React Testing Library

Create:

```text
app/router
app/providers
app/layouts
app/config

components/ui

lib/api
lib/auth
lib/i18n
lib/validation
lib/utils

locales/en
locales/so

assets/brand
```

Create layout foundations only:

- PublicLayout
- StudentLayout
- UniversityLayout
- OrganizationLayout
- AdminLayout

Do not build fake dashboards.

## Design system foundation

Read `docs/product/BRAND_AND_UI_GUIDELINES.md`.

Create:

- centralized color tokens
- typography token structure
- spacing/radius/shadow token structure
- motion tokens
- semantic Tailwind mapping
- baseline accessible shared UI primitives where useful

Do not invent permanent FursadHub colors if exact values are not documented.

Use the approved repository logo asset when available.

Do not generate a new logo.

Prepare reusable status/motion primitives such as:

- StatusBadge
- StatusIndicator
- AnimatedCheck
- Loading/Skeleton foundations

Do not overbuild the full UI component library before it is needed.

Respect `prefers-reduced-motion`.

## API client foundation

Create centralized API client.

Prepare for future:

```http
Authorization: Bearer <access-token>
```

Do not implement actual JWT login yet.

Never use localStorage for authentication tokens.

## Local infrastructure

Create:

```text
infra/compose.yaml
```

Provide local:

- PostgreSQL
- S3-compatible object storage
- mail catcher where practical

Defaults:

```text
React       5173
Spring Boot 8080
PostgreSQL  5432
```

Create `.env.example`.

Do not commit real secrets.

## Flyway

Configure migrations.

Create only the minimal migration needed to prove the infrastructure.

Do not use `ddl-auto=update`.

## Backend testing foundation

Use:

- JUnit
- Spring Boot Test
- Testcontainers PostgreSQL

Add an integration test proving:

1. PostgreSQL container starts
2. Flyway runs
3. Spring connects
4. migration-backed read/write works

No H2 primary integration database.

## E2E foundation

Configure Playwright under `e2e/`.

No complete business journeys yet.

## CI

Create GitHub Actions checks.

Backend:

```text
compile
unit tests
integration tests
build
```

Frontend:

```text
npm ci
lint
typecheck
unit tests
production build
```

CI fails on required failure.

## Docker

Create production-capable Dockerfiles:

```text
apps/api/Dockerfile
apps/web/Dockerfile
```

Use sensible multi-stage builds.

Do not deploy production yet.

## Health

Configure safe Actuator health endpoint.

Do not publicly expose sensitive Actuator/configuration endpoints.

## Documentation

Create/update:

```text
README.md
SECURITY.md
docs/architecture/overview.md

docs/adr/ADR-001-modular-monolith.md
docs/adr/ADR-002-postgresql.md
docs/adr/ADR-003-jwt-authentication.md
docs/adr/ADR-004-private-object-storage.md
docs/adr/ADR-005-university-attestation.md
docs/adr/ADR-006-billing-ready-architecture.md
docs/adr/ADR-007-frontend-design-system.md
```

## Phase 0 success criteria

All relevant commands must succeed:

```text
docker compose -f infra/compose.yaml up -d

backend starts
frontend starts
Flyway runs
Testcontainers test passes
Actuator health responds
frontend lint passes
frontend typecheck passes
frontend tests pass
frontend build passes
backend verify/build passes
CI workflow exists
no secrets/private keys committed
```

STOP after Phase 0.

---

# PHASE 1 — AUTHENTICATION & ACCOUNT SECURITY

## Goal

Implement production-safe:

```text
Email registration/verification
+
JWT access token
+
rotating opaque refresh token
```

## User

Create User with UUID.

States exactly:

```text
PENDING_CONTACT_VERIFICATION
ACTIVE
SUSPENDED
CLOSED
```

Include:

- normalized email
- password hash
- account status
- preferred locale
- email_verified_at
- created/updated timestamps

## Registration

Implement:

```http
POST /api/v1/auth/register
```

User enters at minimum:

- email
- password
- required password confirmation only on frontend if desired

Backend:

- normalize email
- validate
- securely hash password
- reject duplicate email safely
- create account as PENDING_CONTACT_VERIFICATION
- generate one-time email-verification token
- queue verification email through appropriate abstraction/outbox

## Email verification

Implement:

```http
POST /api/v1/auth/email/verify
POST /api/v1/auth/email/resend
```

Email verification token:

- opaque secure random value
- not JWT
- only hash persisted
- expires
- one-time use
- replay fails

Successful verification activates account appropriately.

Create a polished frontend verification success state using the approved one-time animated check pattern.

Animation must respect reduced-motion.

## Login

Implement:

```http
POST /api/v1/auth/login
```

On success:

- create approximately 10-minute JWT
- create opaque refresh token
- store only refresh-token hash
- set refresh token HttpOnly cookie
- return access token + expiresIn

React stores access token only in memory.

## JWT

Use Spring Security OAuth2 Resource Server.

Validate:

- signature
- issuer
- audience
- expiration

Prefer RS256.

Minimal claims.

## Refresh

Implement:

```http
POST /api/v1/auth/refresh
```

Requirements:

- cookie refresh token
- hash lookup
- expiration
- rotation
- family
- reuse detection
- revoke replayed family

## Logout

Implement:

```http
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
```

## Password reset

Implement:

```http
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
```

Reset token:

- opaque
- secure random
- hash persisted
- expiration
- one-time
- replay fails

Successful reset revokes active refresh sessions.

## `/me`

Implement:

```http
GET /api/v1/me
```

## Security

Implement:

- strong password hashing
- login rate limiting
- forgot-password rate limiting
- email-verification resend rate limiting
- secure cookie configuration
- controlled CORS
- appropriate CSRF/origin protections
- login auditing
- no sensitive token logging

Do not add Redis solely for rate limiting unless a concrete need is demonstrated and approved.

## Frontend

Implement:

- RegisterPage
- LoginPage
- VerifyEmailPage
- ForgotPasswordPage
- ResetPasswordPage
- auth memory store/provider
- refresh-on-app-start
- `/me`
- authenticated route foundation
- English and Somali
- approved FursadHub brand system
- accessible loading/error/success transitions

## Mandatory tests

At least:

- registration success
- duplicate registration
- email verification success
- expired verification token
- verification token replay
- resend behavior/rate limit
- valid login
- invalid password
- suspended account
- valid JWT
- expired JWT
- invalid issuer
- invalid audience
- invalid signature
- refresh success
- refresh rotation
- revoked refresh
- expired refresh
- refresh replay detection
- logout
- logout-all
- password reset
- expired reset
- reset replay
- password reset revokes refresh sessions
- `/me`

STOP after Phase 1.

---

# PHASE 2 — UNIVERSITIES, DEPARTMENTS & STUDENT VERIFICATION

## Goal

Build university structure and University Attestation.

Implement:

- University
- Department
- UniversityMembership
- UniversityMembershipDepartment / equivalent scope relation
- StudentProfile
- StudentEnrollment
- StudentVerificationCase
- VerificationChallenge where needed
- VerificationEvents/audit

University roles:

```text
UNIVERSITY_ADMIN
DEPARTMENT_COORDINATOR
UNIVERSITY_SUPERVISOR
```

Institution verification states exactly:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
NEEDS_CHANGES
VERIFIED
REJECTED
SUSPENDED
REVOKED
```

Student verification states exactly:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
NEEDS_MORE_EVIDENCE
VERIFIED
REJECTED
REVOKED
```

Student enrollment invariant:

```text
UNIQUE(university_id, student_number)
```

Do NOT implement Face++, facial recognition, or biometrics.

Use University Attestation.

Where QR/OTP account binding is implemented:

- secure random token
- short expiration
- hash storage where appropriate
- one-time use
- replay blocked
- transactional consumption

Frontend:

Student:
- profile
- claim enrollment
- submit verification
- view status

University:
- departments
- student list
- verification queue
- verification-case detail
- staff foundations

When verification changes into VERIFIED, use the approved one-time verified animation, then stable status.

Mandatory authorization tests:

- University A cannot read University B protected records.
- CS coordinator cannot access Business students.
- Coordinator cannot verify outside assigned departments.
- Supervisor scope is enforced.
- Duplicate university/student number is blocked.
- Expired challenge fails.
- Used challenge fails on replay.

STOP after Phase 2.

---

# PHASE 3 — ORGANIZATIONS & INTERNSHIP OPPORTUNITIES

## Goal

Build organization management and flexible internship publishing.

Implement:

- Organization
- OrganizationMembership
- institution verification
- InternshipOpportunity
- OpportunityTarget
- target departments

Organization roles:

```text
ORGANIZATION_ADMIN
RECRUITER
ORGANIZATION_SUPERVISOR
```

Organization types:

```text
COMPANY
NGO
GOVERNMENT
OTHER
```

Opportunity modes exactly:

```text
PUBLIC
UNIVERSITY_TARGETED
HYBRID
```

Opportunity states exactly:

```text
DRAFT
PUBLISHED
PAUSED
CLOSED
CANCELLED
```

Target states exactly:

```text
REQUESTED
ACKNOWLEDGED
NOMINATING
COMPLETED
DECLINED
EXPIRED
```

Implement explicit commands:

- create
- edit
- publish
- pause
- resume
- close
- cancel

Public discovery:

```http
GET /api/v1/public/opportunities
GET /api/v1/public/opportunities/{id}
```

Use pagination/filtering.

Frontend:

Organization:
- opportunity list
- create/edit
- mode selection
- target universities/departments
- publish/pause/close

Public/student:
- internship listing
- filters
- opportunity details

Mandatory tests:

- Org A cannot manage Org B.
- Unverified organization cannot publish.
- Draft opportunity not publicly visible.
- Target department belongs to target university.
- Invalid transition rejected.
- PUBLIC/TARGETED/HYBRID rules correct.

STOP after Phase 3.

---

# PHASE 4 — APPLICATIONS, NOMINATIONS, CANDIDACY & OFFERS

## Goal

Create one unified recruitment pipeline.

## Public application

Allowed only when:

- verified enrollment
- published opportunity
- mode PUBLIC or HYBRID
- deadline valid
- eligibility/availability valid

Do not accept studentId for self-application.

## Nomination

Only when:

- authorized coordinator
- correct targeted university
- authorized/eligible department
- student enrollment VERIFIED
- deadline valid
- relevant availability valid

States:

```text
PENDING_STUDENT_CONSENT
ACCEPTED
DECLINED
WITHDRAWN
```

Student must consent.

## Candidacy

Constraint:

```text
UNIQUE(opportunity_id, student_id)
```

Sources:

```text
SELF_APPLICATION
UNIVERSITY_NOMINATION
BOTH
```

Application + nomination must merge into the same candidacy.

States exactly:

```text
SUBMITTED
UNDER_REVIEW
SHORTLISTED
INTERVIEW
OFFERED
OFFER_DECLINED
OFFER_EXPIRED
ACCEPTED
REJECTED
WITHDRAWN
```

Implement history/events.

## Screening questions

Maximum 5.

Types:

```text
SHORT_TEXT
LONG_TEXT
YES_NO
SINGLE_CHOICE
```

No generic forms engine.

## Internship offer

Separate entity.

States:

```text
PENDING
ACCEPTED
DECLINED
EXPIRED
WITHDRAWN
```

Offer acceptance must atomically:

- accept offer
- accept candidacy
- create exactly one placement
- update availability
- audit

Frontend should provide clear one-time confirmation animations for successful apply/nomination acceptance/offer acceptance, without blocking navigation.

Mandatory tests:

- duplicate candidacy impossible
- apply + nomination -> BOTH
- unverified student rejected
- targeted-only opportunity rejects public application
- unauthorized coordinator cannot nominate
- organization isolation
- only authorized organization can send offer
- only candidate student can accept
- repeated acceptance cannot duplicate placement

STOP after Phase 4.

---

# PHASE 5 — PLACEMENTS & SUPERVISORS

Implement placement states exactly:

```text
PLANNED
ACTIVE
COMPLETION_PENDING
COMPLETED
CANCELLED
TERMINATED
```

Implement:

- placement creation
- university/org references
- department snapshot/reference
- dates
- history
- start
- cancel
- terminate
- completion request
- complete
- availability updates
- supervisor assignments/history

Supervisor types:

```text
UNIVERSITY
ORGANIZATION
```

Authorization tests:

- student sees own placement
- university scope
- department scope
- organization scope
- supervisor assignment scope

STOP after Phase 5.

---

# PHASE 6 — INTERNSHIP MANAGEMENT

Implement controlled InternshipPolicy:

```text
weekly_logs_required
attendance_required
organization_evaluation_required
final_report_required
defense_required
```

No generic workflow engine.

Weekly logs:

```text
DRAFT
SUBMITTED
RETURNED_FOR_CHANGES
REVIEWED
```

Attendance:

```text
PRESENT
ABSENT
EXCUSED
```

Confirmation:

```text
RECORDED
CONFIRMED
DISPUTED
RESOLVED
```

No GPS/biometric/geofence attendance.

Evaluation:

```text
DRAFT
SUBMITTED
FINAL
```

Final report:

```text
DRAFT
SUBMITTED
NEEDS_REVISION
APPROVED
```

Defense attempt:

```text
SCHEDULED
COMPLETED
CANCELLED
```

Defense result:

```text
PASSED
FAILED
RETAKE_REQUIRED
```

Retake creates another attempt.

Completion must check enabled policy requirements.

Use appropriate status animations for report approval/completion, then stable state.

Mandatory tests:

- student only submits own data
- assigned supervisors only review allowed placement
- department isolation
- required item blocks completion
- repeated completion is safe
- defense history preserved
- final-report authorization enforced

STOP after Phase 6.

---

# PHASE 7 — FILES, NOTIFICATIONS, PRIVACY, ADMIN & AUDIT

## Files

Implement:

- private object storage
- random storage keys
- MIME/size validation
- metadata
- classification
- authorized download
- retention metadata
- audit of sensitive access

Never expose permanent public CV/report URLs.

## Notifications

Implement:

- in-app notifications
- PostgreSQL-backed email outbox
- retries
- delivery status

SMTP failure must not roll back a successful business transaction.

## Legal documents

Versioned:

```text
TERMS
PRIVACY_POLICY
COOKIE_POLICY
```

Languages:

```text
EN
SO
```

Track terms acceptance.

Keep optional consent separate.

## Privacy requests

Support:

```text
ACCESS
CORRECTION
ERASURE
RESTRICTION
PORTABILITY
OBJECTION
```

States:

```text
SUBMITTED
IN_REVIEW
COMPLETED
REJECTED
```

## Admin

Support:

- institution verification
- account suspension
- verification escalation
- privacy requests
- audit viewing
- platform operational statistics

Do not implement account impersonation.

STOP after Phase 7.

---

# PHASE 8 — PRODUCTION HARDENING & PILOT LAUNCH

Review:

- JWT security
- refresh rotation/replay
- cookies
- CSRF/origin controls
- CORS
- authorization
- rate limits
- password/reset security
- verification tokens
- file authorization
- validation
- dependency vulnerabilities
- error leakage
- logging/privacy

Run full:

- backend unit
- backend integration
- Testcontainers PostgreSQL
- frontend unit
- lint
- typecheck
- production build
- Playwright

Required E2E journeys:

1. Register -> email verify -> claim enrollment -> university verifies.
2. Organization creates PUBLIC internship -> student applies -> recruiter offers -> student accepts -> placement.
3. Organization creates UNIVERSITY_TARGETED internship -> university nominates -> student consents -> offer -> placement.
4. HYBRID opportunity shows one unified candidate pool.
5. Placement -> weekly log -> review -> attendance -> evaluation -> final report -> defense -> completion.

Review responsive behavior and English/Somali layout.

Review reduced-motion behavior.

Finalize:

- staging
- production deployment approval
- immutable image tags
- rollback
- backups
- restore test
- monitoring
- alerting
- runbooks
- Privacy Policy / Terms launch readiness

Produce final:

```text
BLOCKER
IMPORTANT
CAN DEFER
```

Do not declare production ready with unresolved security-critical blockers.

STOP after Phase 8.

---

# FUTURE PHASE — BILLING

NOT part of the free pilot.

Do not execute unless explicitly requested.

Future concepts may include:

```text
BillingAccount
Plan
Subscription
PlanEntitlement
UsageRecord
InvoiceReference
BillingEvent
EntitlementService
UsageLimitService
BillingProvider
```

Potential account types:

- ORGANIZATION
- UNIVERSITY

Do not assume students pay for core application participation.

Potential plan names are not frozen. Do not hardcode pricing/plans now.

Keep:

- roles
- feature flags
- billing entitlements
- payment provider

as separate concepts.
