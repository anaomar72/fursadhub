\# FursadHub Engineering Source of Truth

This file is the primary engineering contract for FursadHub.

Claude Code MUST read this file before any significant implementation work.  

If another prompt conflicts with this file, stop and report the conflict instead of silently redesigning the system.

Do not change frozen product states, authorization rules, authentication strategy, repository boundaries, or data-protection rules unless the FursadHub team explicitly requests that change.

\---

\# 1. Product

FursadHub is an internship-management SaaS platform initially focused on Somalia.

It connects:

\- Students

\- Universities

\- University departments

\- Companies

\- NGOs

\- Government organizations

\- University coordinators

\- University supervisors

\- Organization recruiters

\- Organization supervisors

\- FursadHub administrators

Initial pilot university:

\- Jamhuriya University

Initial market:

\- Somalia

Supported product UI languages:

\- English

\- Somali

Pilot commercial model:

\- Free pilot

\- Billing-ready architecture

\- No real payment processing until explicitly requested

Primary product outcome:

\- Successful internship placements that are managed through to completion

FursadHub is not only a public internship board. It supports sourcing, recruitment, placement, internship supervision, reporting, evaluation, defense, and completion.

\---

\# 2. Product Workflow

FursadHub supports one InternshipOpportunity model with three sourcing modes:

\- \`PUBLIC\`

\- \`UNIVERSITY_TARGETED\`

\- \`HYBRID\`

Conceptually:

\`\`\`text

Organization creates opportunity

        |

        +---- PUBLIC

        |

        +---- UNIVERSITY_TARGETED

        |

        +---- HYBRID

        |

        v

Candidate sourcing

        |

        v

Unified Candidacy

        |

        v

Recruitment

        |

        v

Internship Offer

        |

        v

Student accepts

        |

        v

Placement

        |

        +---- Weekly logs

        +---- Attendance

        +---- Supervision

        +---- Evaluation

        +---- Final report

        +---- Defense

        |

        v

Completion

\`\`\`

Public applications and university nominations MUST feed one candidate pipeline.

\---

\# 3. Architecture

FursadHub MUST remain a MODULAR MONOLITH during the pilot.

Use:

\- one React application

\- one Spring Boot application

\- one PostgreSQL database

Architecture:

\`\`\`text

React Web Application

        |

        | HTTPS / REST

        v

Spring Boot API

        |

        +---- PostgreSQL

        |

        +---- Private S3-Compatible Object Storage

        |

        +---- Email / Notification Provider

\`\`\`

Do NOT introduce without explicit approval:

\- Microservices

\- Kafka

\- RabbitMQ

\- Kubernetes

\- Redis

\- GraphQL

\- Elasticsearch

\- WebSockets

\- Generic workflow engines

\- Generic permission builders

\- Generic dynamic form builders

Do not solve hypothetical scale problems before FursadHub actually has them.

\---

\# 4. Technology Stack

\## Frontend

Use:

\- React

\- TypeScript

\- Vite

\- Tailwind CSS

\- React Router

\- TanStack Query

\- React Hook Form

\- Zod

\- react-i18next or equivalent

Package manager:

\- npm

Commit:

\- \`package-lock.json\`

Do not introduce Redux unless explicitly approved.

\## Backend

Use:

\- Java 21

\- Spring Boot

\- Spring Web

\- Spring Security

\- Spring Security OAuth2 Resource Server

\- Spring Data JPA

\- PostgreSQL

\- Flyway

\- Bean Validation

\- Spring Boot Actuator

\- Springdoc OpenAPI

\- Maven

Testing:

\- JUnit

\- Spring Boot Test

\- Testcontainers with PostgreSQL

Do not use H2 as the primary integration-test database.

\## Infrastructure

Use:

\- Docker

\- Docker Compose

\- GitHub Actions

\- PostgreSQL

\- private S3-compatible object storage

\- SMTP / transactional email provider

\- Spring Boot Actuator

\- centralized production error monitoring when production infrastructure exists

Do not introduce Kubernetes for the pilot.

\---

\# 5. Repository

The repository is a single monorepo.

Read:

\- \`docs/architecture/REPOSITORY_STRUCTURE.md\`

The high-level structure is:

\`\`\`text

fursadhub/

├── apps/

│   ├── api/

│   └── web/

├── e2e/

├── infra/

├── docs/

├── scripts/

├── .github/

├── CLAUDE.md

├── README.md

├── SECURITY.md

├── .env.example

└── .gitignore

\`\`\`

Do not create empty fake business classes only to populate future directories.

Create code when its implementation phase begins.

\---

\# 6. Backend Module Convention

Every meaningful backend module should follow:

\`\`\`text

feature/

├── api/

├── application/

├── domain/

└── infrastructure/

\`\`\`

\## \`api\`

Contains:

\- REST controllers

\- request DTOs

\- response DTOs

HTTP concerns only.

\## \`application\`

Contains:

\- use cases

\- transaction orchestration

\- coordination between domain objects and repositories

\## \`domain\`

Contains:

\- entities

\- value objects

\- enums

\- state-transition rules

\- business invariants

\- repository interfaces

\## \`infrastructure\`

Contains:

\- JPA implementations

\- persistence adapters

\- object storage adapters

\- email adapters

\- external-provider integrations

Never expose JPA entities directly through REST.

Do not organize the whole backend as one global:

\`\`\`text

controller/

service/

repository/

entity/

\`\`\`

tree.

\---

\# 7. Backend Modules

Expected bounded modules include:

\`\`\`text

common

identity

student

university

organization

verification

opportunity

candidacy

placement

internshipmanagement

file

notification

compliance

administration

\`\`\`

Future billing may become:

\`\`\`text

billing

\`\`\`

but do not create unnecessary billing implementation during the free pilot.

\---

\# 8. Frontend Architecture

Read:

\- \`docs/product/BRAND_AND_UI_GUIDELINES.md\`

Use feature-oriented React structure.

Substantial features should follow approximately:

\`\`\`text

features/example/

├── api/

├── components/

├── hooks/

├── pages/

├── schemas/

└── types/

\`\`\`

Only genuinely generic UI belongs in:

\`\`\`text

components/ui/

\`\`\`

Examples:

\`\`\`text

Button                 -> components/ui/

Input                  -> components/ui/

Modal                  -> components/ui/

OpportunityCard        -> features/opportunities/

CandidateTable         -> features/candidacies/

VerificationStatusCard -> features/verification/

\`\`\`

Use TanStack Query for server state.

Do not unnecessarily duplicate API state in global client state.

\---

\# 9. React Layouts

Use one React application with layouts such as:

\- \`PublicLayout\`

\- \`StudentLayout\`

\- \`UniversityLayout\`

\- \`OrganizationLayout\`

\- \`AdminLayout\`

Do not create separate React applications for each role.

\---

\# 10. API Contract

Base prefix:

\`\`\`text

/api/v1

\`\`\`

Use:

\- REST

\- JSON

\- request DTOs

\- response DTOs

\- OpenAPI

Important business transitions should use explicit command endpoints.

Examples:

\`\`\`http

POST /api/v1/opportunities/{id}/publish

POST /api/v1/candidacies/{id}/shortlist

POST /api/v1/candidacies/{id}/offer

POST /api/v1/candidacies/{id}/accept-offer

\`\`\`

Avoid generic status mutation when a status represents an important business command.

Bad:

\`\`\`http

PATCH /api/v1/candidacies/{id}

{

  "status": "WHATEVER_THE_CLIENT_WANTS"

}

\`\`\`

\---

\# 11. API Error Format

Use stable machine-readable error codes.

Example:

\`\`\`json

{

  "code": "STUDENT_NOT_VERIFIED",

  "message": "Your university enrollment must be verified before applying.",

  "status": 403,

  "path": "/api/v1/opportunities/...",

  "timestamp": "...",

  "fieldErrors": []

}

\`\`\`

Examples:

\`\`\`text

ACCOUNT_SUSPENDED

INVALID_CREDENTIALS

REFRESH_TOKEN_INVALID

REFRESH_TOKEN_REUSE_DETECTED

STUDENT_NOT_VERIFIED

STUDENT_ALREADY_NOMINATED

STUDENT_ALREADY_APPLIED

STUDENT_NOT_AVAILABLE

OPPORTUNITY_NOT_PUBLISHED

OPPORTUNITY_DEADLINE_PASSED

OPPORTUNITY_NOT_PUBLIC

OPPORTUNITY_NOT_TARGETED_TO_UNIVERSITY

CANDIDACY_INVALID_TRANSITION

ACCESS_DENIED

VALIDATION_FAILED

VERIFICATION_CASE_ALREADY_RESOLVED

\`\`\`

Frontend logic must never depend on parsing English error messages.

\---

\# 12. Self-Service API Rule

When authentication already identifies the actor, do not accept that user's ID from the browser.

Good:

\`\`\`http

POST /api/v1/opportunities/{id}/applications

\`\`\`

Bad:

\`\`\`json

{

  "studentId": "someone-else"

}

\`\`\`

\---

\# 13. Account Registration and Email Verification

Every PUBLIC SELF-SERVICE account registration begins with email/password registration.

This section governs public registration only.

Internal university/organization staff MUST NOT be forced through public self-registration before receiving a staff role.

Admin-provisioned staff accounts are governed by Section 26A, Managed Staff Provisioning.

Expected account flow:

\`\`\`text

User enters email + password

        |

        v

POST /api/v1/auth/register

        |

        v

Account created as

PENDING_CONTACT_VERIFICATION

        |

        v

FursadHub sends verification email

        |

        v

User verifies one-time email token

        |

        v

Email becomes verified

        |

        v

Account becomes ACTIVE

\`\`\`

Email verification and university-student verification are DIFFERENT concepts.

\`\`\`text

EMAIL VERIFIED

!=

VERIFIED UNIVERSITY ENROLLMENT

\`\`\`

A user may have an active email-verified account but still be blocked from student internship participation until their university enrollment is verified.

Expected endpoints:

\`\`\`http

POST /api/v1/auth/register

POST /api/v1/auth/email/verify

POST /api/v1/auth/email/resend

\`\`\`

Email-verification tokens:

\- are not JWT

\- are cryptographically secure opaque random tokens

\- are stored only as hashes in PostgreSQL

\- expire

\- are one-time use

\- must fail on replay

\---

\# 14. Authentication Architecture

FursadHub uses:

\`\`\`text

Short-Lived JWT Access Token

\+

Rotating Opaque Refresh Token

\`\`\`

Do not use server-side session authentication.

Do not store access tokens in persistent browser storage.

\---

\# 15. JWT Access Token

Requirements:

\- JWT

\- approximately 10-minute lifetime

\- asymmetric signing

\- prefer RS256

\- stored in React application memory only

\- sent as:

\`\`\`http

Authorization: Bearer \<access-token>

\`\`\`

Do NOT store access JWTs in:

\- localStorage

\- sessionStorage

\- IndexedDB

\- cookies

Recommended minimal claims:

\`\`\`text

sub

iss

aud

iat

exp

jti

\`\`\`

Do not put sensitive student information in JWTs.

JWT establishes identity.

Current resource authorization must use current PostgreSQL data.

Do not rely only on JWT claims for current university, department, organization, or membership access.

\---

\# 16. JWT Validation

Use Spring Security OAuth2 Resource Server.

Do not create unnecessary custom JWT filters and parsers when Spring Security already supports validation.

Validate:

\- signature

\- issuer

\- audience

\- expiration

Configuration concept:

\`\`\`text

JWT_PRIVATE_KEY

JWT_PUBLIC_KEY

JWT_ISSUER=fursadhub

JWT_AUDIENCE=fursadhub-api

JWT_ACCESS_TOKEN_TTL=10m

\`\`\`

Private signing keys must never be committed.

Use separate keys for:

\- local

\- staging

\- production

\---

\# 17. Refresh Tokens

Refresh tokens:

\- are NOT JWT

\- are secure opaque random values

\- have approximately a 30-day lifetime

\- are stored in an HttpOnly browser cookie

\- are Secure in production

\- use an appropriate SameSite policy

\- are stored only as hashes in PostgreSQL

Never store raw refresh tokens in PostgreSQL or logs.

Conceptual model:

\`\`\`text

refresh_tokens

\-----------------------------

id UUID

user_id UUID

token_hash

family_id UUID

expires_at

revoked_at

created_at

last_used_at

replaced_by_token_id

user_agent

created_ip

\`\`\`

\---

\# 18. Refresh Rotation and Replay Detection

Every successful refresh MUST rotate the refresh token.

\`\`\`text

Token A

   |

   v

POST /api/v1/auth/refresh

   |

   +---- validate A

   +---- revoke A

   +---- create B

   +---- issue new JWT

   +---- set B cookie

\`\`\`

A used token must not remain valid.

If a previously used/revoked refresh token is replayed:

1\. reject the request

2\. revoke the token family

3\. create a security audit event

4\. require login again

\---

\# 19. Authentication Endpoints

Expected:

\`\`\`http

POST /api/v1/auth/register

POST /api/v1/auth/email/verify

POST /api/v1/auth/email/resend

POST /api/v1/auth/login

POST /api/v1/auth/refresh

POST /api/v1/auth/logout

POST /api/v1/auth/logout-all

POST /api/v1/auth/password/forgot

POST /api/v1/auth/password/reset

GET /api/v1/me

\`\`\`

\---

\# 20. Password Reset

Password-reset tokens are not JWT.

Use:

\- secure opaque random token

\- only hash stored in PostgreSQL

\- expiration

\- one-time use

Successful password reset must:

\- update password securely

\- consume token

\- revoke active refresh sessions

Avoid unnecessary account-existence leakage from forgot-password endpoints.

\---

\# 21. Browser Security

Do not blindly disable CSRF.

The JWT travels in the Authorization header.

Refresh/logout use cookies and therefore need deliberate protection.

Use:

\- controlled CORS

\- trusted origins

\- appropriate SameSite policy

\- Origin validation where appropriate

\- appropriate CSRF protection for cookie-authenticated operations

Never disable CSRF merely because a tutorial did so.

\---

\# 22. Account States

Use exactly:

\`\`\`text

PENDING_CONTACT_VERIFICATION

ACTIVE

SUSPENDED

CLOSED

\`\`\`

Do not invent additional states without explicit approval.

\---

\# 23. Roles

\## Platform

\`\`\`text

SUPER_ADMIN

VERIFICATION_OFFICER

\`\`\`

\## University

\`\`\`text

UNIVERSITY_ADMIN

DEPARTMENT_COORDINATOR

UNIVERSITY_SUPERVISOR

\`\`\`

\## Organization

\`\`\`text

ORGANIZATION_ADMIN

RECRUITER

ORGANIZATION_SUPERVISOR

\`\`\`

\## Student

\`\`\`text

STUDENT

\`\`\`

Roles are contextual.

Internal managed staff roles are NOT public self-registration roles.

Tenant-admin assignability is intentionally narrow:

\```text

UNIVERSITY_ADMIN
-> DEPARTMENT_COORDINATOR
-> UNIVERSITY_SUPERVISOR

ORGANIZATION_ADMIN
-> RECRUITER
-> ORGANIZATION_SUPERVISOR

\```

University/organization admins MUST NOT assign:

\- `SUPER_ADMIN`
\- `VERIFICATION_OFFICER`
\- another tenant's admin role
\- cross-domain staff roles
\- their own parent admin role

The creator/manager relationship does NOT imply permission inheritance.

A staff member receives only the explicitly assigned current membership/role and resource scope.
\---

\# 24. Authorization

Authorization requires:

\`\`\`text

Authenticated

\+

Current Membership / Role

\+

Resource Scope

\`\`\`

Never authorize only from a role string.

Example:

\`\`\`text

RECRUITER

\`\`\`

does not mean:

\`\`\`text

may access every organization's candidates

\`\`\`

Spring Boot must enforce the organization membership.

Similarly:

\`\`\`text

DEPARTMENT_COORDINATOR

\`\`\`

does not mean:

\`\`\`text

may access every department

\`\`\`

Spring Boot must verify assigned department scope.

Prefer dedicated components such as:

\`\`\`text

OrganizationAuthorization

UniversityAuthorization

StudentAuthorization

PlacementAuthorization

FileAuthorization

\`\`\`

Authorization asks:

_> May this actor act on this resource?_

Domain logic asks:

_> Is this business transition valid?_

Keep those separate.

Frontend route guards are UX only, not security.

\---

\# 25. University Structure

Model:

\`\`\`text

University

   |

   +---- Departments

   |

   +---- UniversityMemberships

\`\`\`

University Admin:

\- entire university scope

Department Coordinator:

\- assigned departments only

University Supervisor:

\- assigned placements only unless explicitly authorized otherwise

Department isolation is a critical backend security boundary.

\---

\# 26. Organization Structure

Organization types:

\`\`\`text

COMPANY

NGO

GOVERNMENT

OTHER

\`\`\`

Organization isolation is a critical backend security boundary.

A member of Organization A must never access Organization B private resources by changing an ID in a URL/request.

\---

\# 26A. Managed Staff Provisioning

Managed staff provisioning is a real production feature.

It MUST work consistently in:

\```text

LOCAL
CI
STAGING
PRODUCTION

\```

Do not implement managed staff as:

\- seed data
\- localhost-only logic
\- demo users
\- development authentication bypasses
\- hardcoded credentials
\- a second authentication system

The only environment-specific seeded administrator account, if one exists for development, is a separate concern and MUST NOT be reused as the managed-staff mechanism.

\## Problem Being Solved

University and organization staff are internal managed accounts.

They MUST NOT need to first self-register as:

\- `STUDENT`
\- a university account
\- an organization account

before a tenant admin can assign an internal staff role.

The old conceptual flow:

\```text

existing FursadHub user
|
v
admin enters existing email
|
v
assign role + scope

\```

is insufficient for internal staff.

The required flow is:

\```text

authorized tenant admin
|
v
create managed staff account
|
+---- email / required identity fields
|
+---- initial password + confirmation, supplied by the admin
|
+---- allowed staff role
|
+---- required resource scope
|
v
server validates tenant + role + scope + password policy + confirmation match
|
v
create User + membership/role/scope atomically, already ACTIVE
|
v
staff uses normal FursadHub authentication
|
v
backend authorizes from current PostgreSQL membership + role + resource scope

\```

\## Identity Model

Managed staff MUST remain part of the existing FursadHub identity model.

Prefer:

\```text

User

- UniversityMembership OR OrganizationMembership
- Role
- Resource Scope

\```

Do NOT introduce a parallel:

\```text

StaffUser
StaffLogin
StaffPassword
StaffSession

\```

authentication system.

A managed staff account is a normal FursadHub identity with a tenant-managed membership.

If the implementation needs to distinguish provisioning origin, use the smallest explicit membership/account provenance mechanism consistent with the existing model.

Do NOT invent a new account state for managed staff.

Use only the account states defined in Section 22.

\## Staff Account Creation

An authorized University Admin or Organization Admin may create a managed staff account for their own tenant.

The admin supplies only the identity, credential, and assignment data required by the existing domain model, such as:

\- email
\- initial password + confirmation (see "Initial Credentials" below)
\- display/name fields already required by `User`, if any
\- assignable staff role
\- required scope

The staff email does NOT need to belong to an already registered FursadHub user.

Do not silently convert an unrelated existing account into managed staff.

If the email already belongs to an existing identity, follow the existing explicit multi-membership rules if they safely support the requested membership.

Otherwise reject with a stable conflict error.

Never guess or silently replace an existing account type.

\## Initial Credentials

The creating University/Organization Admin supplies the initial staff password directly in the account-creation form, confirmed by re-entry (Password + Confirm Password).

The server MUST still:

\- enforce the current password policy on the submitted password
\- reject the request with a stable error code if the password and confirmation do not match
\- be hashed using the same production password hashing mechanism as normal authentication
\- be stored only as a hash
\- never be written to logs
\- never be written to audit-event metadata
\- never be put in JWT claims
\- never be returned in the account-creation response — the admin already knows it, since they typed it
\- never be returned by later staff list/detail endpoints

A dedicated credential-reset action (see "Staff Management" below) remains server-generated: an admin resetting an existing staff member's password does not choose the new value. Use cryptographically secure randomness appropriate to Java/Spring for it. That action's plaintext MAY be returned exactly once in the successful reset response to the authorized resetting admin. After that response, the server MUST NOT provide a password-retrieval operation for it.

If the existing product supports a first-login/temporary-password rotation mechanism, reuse it for the reset action.

Do not invent an additional account state merely to represent a temporary password.

\## Contact Verification

Managed staff are the one deliberate, explicitly authorized exception to the contact-verification requirement in Section 13 — approved by the FursadHub team specifically for this feature, not a general precedent.

A managed staff account is created already `ACTIVE`. No verification email is sent, and there is no separate verification step for the staff member to complete.

The reasoning: the creating University/Organization Admin is vouching for this specific person's identity and email address directly — that is the entire point of provisioning being an admin action rather than public self-service registration. Re-verifying an email the admin already typed and vouched for would be redundant, not an extra safeguard.

This exception is narrow and must stay narrow:

\- it applies ONLY to accounts created through the managed-staff-provisioning endpoints
\- it does NOT change Section 13's requirement for public self-service registration (student/university/organization founder accounts still register with email + password and MUST verify their email before becoming `ACTIVE`)
\- it does NOT change Section 22's account states — `PENDING_CONTACT_VERIFICATION` still exists and still applies to everyone else
\- do not extend this bypass to any other account-creation path without the same explicit team approval

\## University Staff

`UNIVERSITY_ADMIN` may create/manage only staff memberships belonging to the admin's own university.

Assignable university staff roles are exactly:

\```text

DEPARTMENT_COORDINATOR
UNIVERSITY_SUPERVISOR

\```

A University Admin MUST NOT create or assign:

\- `SUPER_ADMIN`
\- `VERIFICATION_OFFICER`
\- `ORGANIZATION_ADMIN`
\- `RECRUITER`
\- `ORGANIZATION_SUPERVISOR`
\- another `UNIVERSITY_ADMIN`

\### Department Coordinator Scope

`DEPARTMENT_COORDINATOR` requires explicit department scope.

The scope is one or more assigned departments belonging to the same university.

Example:

\```text

Jamhuriya University

Assigned:
\- IT

Not assigned:
\- Medicine
\- Engineering

\```

The coordinator may access authorized coordinator functionality for IT only.

Being a member of Jamhuriya University is NOT sufficient to access Medicine or Engineering.

Required authorization is:

\```text

authenticated
AND
current University membership
AND
DEPARTMENT_COORDINATOR role
AND
requested department is in assigned department scope
AND
required permission for the operation

\```

A request outside the assigned department set MUST fail even when the target department belongs to the same university.

Department isolation remains a critical backend security boundary.

\### University Supervisor Scope

`UNIVERSITY_SUPERVISOR` uses the existing supervisor semantics.

Per Section 25, University Supervisor scope is assigned placements only unless explicitly authorized otherwise.

Creating a University Supervisor account does NOT grant University Admin scope.

Placement assignment remains part of the existing placement/supervision workflow.

Do not invent university-wide supervisor access during staff provisioning.

\## Organization Staff

`ORGANIZATION_ADMIN` may create/manage only staff memberships belonging to the admin's own organization.

Assignable organization staff roles are exactly:

\```text

RECRUITER
ORGANIZATION_SUPERVISOR

\```

An Organization Admin MUST NOT create or assign:

\- `SUPER_ADMIN`
\- `VERIFICATION_OFFICER`
\- `UNIVERSITY_ADMIN`
\- `DEPARTMENT_COORDINATOR`
\- `UNIVERSITY_SUPERVISOR`
\- another `ORGANIZATION_ADMIN`

\### Recruiter Scope

`RECRUITER` is scoped to the current organization and only the recruitment capabilities authorized by the existing domain rules.

Organization membership alone does NOT grant Organization Admin capabilities.

A Recruiter MUST NOT access:

\- organization administration/settings
\- staff provisioning
\- staff role management
\- another organization's candidates
\- another organization's private resources

\### Organization Supervisor Scope

`ORGANIZATION_SUPERVISOR` uses the existing placement-supervisor semantics.

Supervisor access MUST be limited to placements/resources explicitly authorized by current assignment data.

Creating an Organization Supervisor account does NOT grant Organization Admin scope.

\## Tenant Ownership

The authoritative ownership relationship is the University/Organization membership.

Do NOT authorize managed staff or staff-management operations only from `createdByUserId`.

The creator may change later; the membership still belongs to the tenant.

When authentication already identifies the tenant admin, do not trust a browser-supplied university/organization ID as authority.

The backend MUST derive or verify tenant ownership from current PostgreSQL membership data.

University A MUST NOT:

\- create staff for University B
\- list University B staff
\- change University B staff roles
\- change University B staff scope
\- reset University B staff credentials
\- suspend/reactivate University B staff

Organization A has the equivalent restrictions against Organization B.

\## Role + Scope Authorization

Managed staff authorization follows Section 24.

Always evaluate:

\```text

Authenticated

- Current Membership
- Current Role
- Current Resource Scope
- Required Permission

\```

Never authorize from role string alone.

Never authorize from tenant equality alone.

Never authorize from frontend navigation state.

Never trust stale JWT claims for current tenant/department/membership scope.

Current PostgreSQL data remains authoritative.

Unknown, missing, inconsistent, orphaned, or invalid role/scope data MUST fail closed.

Never fall back to:

\- full university scope
\- full organization scope
\- admin scope
\- `SUPER_ADMIN`

\## No Permission Inheritance

The admin who creates a staff account manages the account but does not donate their permissions.

\```text

UNIVERSITY_ADMIN creates DEPARTMENT_COORDINATOR
!=
DEPARTMENT_COORDINATOR inherits UNIVERSITY_ADMIN

ORGANIZATION_ADMIN creates RECRUITER
!=
RECRUITER inherits ORGANIZATION_ADMIN

\```

Staff must not access the parent admin console or admin-only APIs unless an explicit existing permission authorizes the exact operation.

Backend authorization is mandatory even if frontend navigation is hidden.

\## Staff Management

A tenant admin may manage only managed staff within their own tenant.

The supported management surface should reuse existing account/membership conventions and may include:

\- list/view managed staff
\- change to another role that the same tenant admin is allowed to assign
\- change valid scope
\- suspend/reactivate using existing `SUSPENDED` / `ACTIVE` account-state rules where the current architecture permits
\- issue a new temporary password through a dedicated server-generated credential-reset action

Do not expose or recover the existing password.

A credential reset MUST:

1. authorize the parent tenant admin
2. generate a new cryptographically secure temporary password server-side
3. store only the new password hash
4. invalidate the old password
5. revoke active refresh sessions where required by the current security model
6. return the new plaintext temporary password once
7. never expose that plaintext again

Staff updates MUST enforce the same assignable-role and tenant/scope checks as staff creation.

This attack must fail:

\```text

create RECRUITER
|
v
update role to SUPER_ADMIN

\```

\## Transaction and Concurrency Rules

Managed staff creation is security-sensitive and MUST be atomic.

If account creation requires:

\```text

User

- Membership
- Role assignment
- Scope assignment
- Audit event

\```

the operation must complete as one transaction where appropriate.

Do not leave partially provisioned users.

Database/current identity constraints MUST prevent duplicate identities under concurrent requests.

Do not rely only on frontend duplicate-email validation.

\## Stable Errors

Use the standard API error contract from Section 11.

Add stable error codes only when needed, for example:

\```text

STAFF_EMAIL_ALREADY_EXISTS
STAFF_ROLE_NOT_ASSIGNABLE
STAFF_SCOPE_REQUIRED
STAFF_SCOPE_INVALID
STAFF_NOT_IN_TENANT

\```

Do not make frontend behavior depend on English message parsing.

Do not expose whether a cross-tenant staff resource exists when the existing authorization convention intentionally uses scoped `404`.

\## API Design

Managed staff provisioning belongs to the relevant University/Organization application modules, not to public registration.

Use REST under `/api/v1` and existing module conventions.

When the authenticated admin already identifies the owning tenant, do not require the browser to choose an arbitrary tenant ID.

Use explicit operations for security-sensitive changes such as:

\- create managed staff
\- change staff role
\- change staff scope
\- reset staff credentials
\- suspend/reactivate staff

Do not use a generic endpoint that accepts arbitrary role/tenant/state mutation from the client.

OpenAPI must document the new production API contract.

\## Frontend Staff Management

The existing University/Organization Staff UI MUST evolve from:

\```text

existing user email

- role
- scope
- Assign staff role

\```

to:

\```text

new staff email

- required identity fields
- allowed role
- required scope
- Create staff account

\```

Do not redesign the surrounding dashboard.

Reuse existing components, tokens, layouts, forms, modals, query patterns, and i18n.

\### University Admin UI

Show only:

\- `DEPARTMENT_COORDINATOR`
\- `UNIVERSITY_SUPERVISOR`

when those roles are assignable in the current context.

For `DEPARTMENT_COORDINATOR`:

\- department scope is required
\- department options must come from the current University
\- one or more assigned departments may be selected according to the existing domain model

Do not show organization roles or `SUPER_ADMIN`.

\### Organization Admin UI

Show only:

\- `RECRUITER`
\- `ORGANIZATION_SUPERVISOR`

Do not show university roles or `SUPER_ADMIN`.

Do not invent a department selector for organization roles.

\### One-Time Credential UI

Account creation does NOT display a generated credential: the admin already typed and confirmed the password themselves. Discard the typed password/confirmation from browser form state immediately after a successful create — do not persist it anywhere.

The credential-reset action (server-generated) still requires a one-time display. After a successful reset, show:

\- staff email
\- generated temporary password
\- role
\- scope summary

State clearly that the password is shown only once.

A deliberate Copy Credentials action is acceptable.

Do not automatically copy credentials.

Do not persist the plaintext password in:

\- localStorage
\- sessionStorage
\- IndexedDB
\- long-lived query cache data
\- URL/query string
\- application logs

Discard plaintext credential state when the success surface is dismissed.

\### Staff List

Tenant admins may see only their own managed staff.

Show non-secret information such as:

\- name/email
\- role
\- scope
\- account status

Never render:

\- password
\- password hash
\- access/refresh tokens

\### Staff Login

Managed staff use the existing FursadHub email/password login endpoint and login UI.

Do NOT create a separate staff login page or authentication pipeline.

Existing Student, University, Organization, platform-admin, and other authentication behavior must remain compatible.

\### Staff Navigation and Routes

Frontend role/route guards are UX only.

They should reflect current server-authorized role/scope:

\- Department Coordinator does not receive University Admin navigation
\- University Supervisor does not inherit University Admin navigation
\- Recruiter does not receive Organization Admin navigation
\- Organization Supervisor does not inherit Organization Admin navigation

A Department Coordinator's UI must not offer unauthorized departments as switchable scope.

Direct navigation to an admin URL must still be rejected by the backend.

\### Internationalization and Design

All new production-visible UI strings MUST use English/Somali translation keys.

Follow Sections 56-58 and `docs/product/BRAND_AND_UI_GUIDELINES.md`.

Do not redesign the existing dashboard visual language for this feature.

\## Super Admin Visibility

Managed staff remain normal FursadHub identities.

The existing Super Admin overall-user visibility MUST continue to include these users through the normal User/membership model.

Do not create a separate Super Admin-only staff identity store.

Super Admin may inspect permitted identity/membership/role/status metadata according to existing administration rules.

Super Admin MUST never be shown:

\- plaintext staff passwords
\- password hashes
\- refresh tokens
\- reset tokens

This feature MUST NOT alter Super Admin seeding or platform-wide Super Admin authorization.

\## Production Readiness

Managed staff provisioning is NOT a local-only feature.

It MUST be deployable without:

\- development credentials
\- localhost assumptions
\- seed dependencies
\- authentication bypasses
\- environment-specific role logic

Any required schema change MUST use Flyway and be safe for an existing non-empty production PostgreSQL database.

Do not reset or destroy existing user data.

Production secrets and credential material follow Sections 64 and 68.

\---

\# 27. Student Verification

Do NOT implement for V1:

\- Face++

\- facial recognition

\- biometric identity verification

\- biometric attendance

Student verification means:

\`\`\`text

VERIFIED UNIVERSITY ENROLLMENT

\`\`\`

Students may register and verify email before enrollment verification.

However, a student without verified enrollment cannot:

\- apply to internships

\- be nominated

\- accept/start a placement as a verified student

\---

\# 28. Student Enrollment

Model:

\`\`\`text

User

  |

  v

StudentProfile

  |

  v

StudentEnrollment

  |

  +---- University

  |

  +---- Department

\`\`\`

Enrollment includes:

\- university

\- department

\- student number

\- program

\- academic year

\- verification status

Critical invariant:

\`\`\`text

UNIQUE(university_id, student_number)

\`\`\`

Implement the exact database constraint carefully if historical/revoked enrollment handling later requires a partial/conditional constraint.

\---

\# 29. University Attestation

Initial verification workflow:

1\. student claims enrollment

2\. authorized university staff checks the university's own source of truth

3\. staff verifies student identity/enrollment

4\. where required, account binding occurs through a short-lived QR/OTP challenge

5\. enrollment becomes VERIFIED

FursadHub does not need direct access to the university student database.

QR/OTP challenges:

\- securely random

\- short-lived

\- hash stored where appropriate

\- one-time use

\- replay resistant

\- consumption performed safely/transactionally

\---

\# 30. Student Verification States

Use exactly:

\`\`\`text

DRAFT

SUBMITTED

UNDER_REVIEW

NEEDS_MORE_EVIDENCE

VERIFIED

REJECTED

REVOKED

\`\`\`

\---

\# 31. Institution Verification

University/organization verification states:

\`\`\`text

DRAFT

SUBMITTED

UNDER_REVIEW

NEEDS_CHANGES

VERIFIED

REJECTED

SUSPENDED

REVOKED

\`\`\`

Verification evidence must remain private.

\---

\# 32. Internship Opportunity

One opportunity model.

Modes:

\`\`\`text

PUBLIC

UNIVERSITY_TARGETED

HYBRID

\`\`\`

\## PUBLIC

Eligible verified students may apply directly.

\## UNIVERSITY_TARGETED

Organization targets one or more universities/departments and requests nominees.

\## HYBRID

Both public applications and nominations are permitted.

Never build separate recruitment systems for public and targeted internships.

\---

\# 33. Opportunity States

Use exactly:

\`\`\`text

DRAFT

PUBLISHED

PAUSED

CLOSED

CANCELLED

\`\`\`

Important transitions should be explicit operations:

\`\`\`text

publish()

pause()

resume()

close()

cancel()

\`\`\`

Do not allow arbitrary status mutation.

\---

\# 34. Opportunity Targets

Targeted/hybrid opportunities can target multiple universities.

Each target may define:

\- university

\- eligible departments

\- requested nominees

\- nomination deadline

\`number_of_openings\` and \`requested_nominees\` are different concepts.

Example:

\`\`\`text

Openings: 5

Requested nominees from university: 10

\`\`\`

Target states:

\`\`\`text

REQUESTED

ACKNOWLEDGED

NOMINATING

COMPLETED

DECLINED

EXPIRED

\`\`\`

\---

\# 35. Student Nominations

Authorized university staff may nominate a student only when:

\- target university matches

\- target department matches

\- coordinator has proper scope

\- student enrollment is VERIFIED

\- deadline is valid

\- student satisfies availability/eligibility rules

Student consent is mandatory.

Nomination states:

\`\`\`text

PENDING_STUDENT_CONSENT

ACCEPTED

DECLINED

WITHDRAWN

\`\`\`

Nomination \`ACCEPTED\` means:

_> student agrees to be considered_

It does not mean the student accepted an internship offer.

\---

\# 36. Unified Candidacy

Exactly one candidacy per:

\`\`\`text

opportunity + student

\`\`\`

Critical constraint:

\`\`\`text

UNIQUE(opportunity_id, student_id)

\`\`\`

Source:

\`\`\`text

SELF_APPLICATION

UNIVERSITY_NOMINATION

BOTH

\`\`\`

If a student applies and is later nominated:

\- do not create a second candidacy

\- merge source to BOTH

\- preserve event/history information

\---

\# 37. Candidacy States

Use exactly:

\`\`\`text

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

\`\`\`

\`INTERVIEW\` is optional.

Valid workflows may skip intermediate recruitment stages.

Only authorized organization staff sends offers.

Only the candidate student accepts/declines the offer.

\---

\# 38. Internship Offer

Use a separate \`InternshipOffer\` domain object.

Offer may contain:

\- candidacy

\- start date

\- end date

\- response deadline

\- location

\- relevant offer details

Offer states:

\`\`\`text

PENDING

ACCEPTED

DECLINED

EXPIRED

WITHDRAWN

\`\`\`

Offer acceptance MUST happen transactionally:

1\. accept offer

2\. mark candidacy ACCEPTED

3\. create exactly one placement

4\. update student availability

5\. create audit history

No partial accepted-without-placement state is allowed.

Repeated acceptance requests must not create duplicate placements.

\---

\# 39. Placement

States:

\`\`\`text

PLANNED

ACTIVE

COMPLETION_PENDING

COMPLETED

CANCELLED

TERMINATED

\`\`\`

\`CANCELLED\`:

\- placement never properly started

\`TERMINATED\`:

\- placement started but ended early

Keep university/department reference/snapshot so historical placement remains tied to the correct academic context.

\---

\# 40. Supervisors

Placement may have:

\- university supervisor

\- organization supervisor

Preserve assignment history.

Track:

\`\`\`text

assigned_at

removed_at

\`\`\`

Do not simply overwrite previous supervisor IDs.

\---

\# 41. Internship Policy

Controlled configuration only:

\`\`\`text

weekly_logs_required

attendance_required

organization_evaluation_required

final_report_required

defense_required

\`\`\`

May be university-level or department-specific.

Do not build a generic workflow/rules engine.

\---

\# 42. Weekly Logs

States:

\`\`\`text

DRAFT

SUBMITTED

RETURNED_FOR_CHANGES

REVIEWED

\`\`\`

Student submits.

Authorized supervisor reviews/returns.

\---

\# 43. Attendance

Attendance:

\`\`\`text

PRESENT

ABSENT

EXCUSED

\`\`\`

Confirmation:

\`\`\`text

RECORDED

CONFIRMED

DISPUTED

RESOLVED

\`\`\`

Do not build GPS, biometric, facial, or geofenced attendance for V1.

\---

\# 44. Evaluation

States:

\`\`\`text

DRAFT

SUBMITTED

FINAL

\`\`\`

Do not build a generic rubric builder during V1.

\---

\# 45. Final Report

States:

\`\`\`text

DRAFT

SUBMITTED

NEEDS_REVISION

APPROVED

\`\`\`

Final report files are private.

\---

\# 46. Defense

Every attempt is preserved separately.

Attempt state:

\`\`\`text

SCHEDULED

COMPLETED

CANCELLED

\`\`\`

Result:

\`\`\`text

PASSED

FAILED

RETAKE_REQUIRED

\`\`\`

A retake creates a new DefenseAttempt.

Never overwrite previous attempts.

\---

\# 47. Files

Use private S3-compatible object storage.

Do not store document bytes directly in PostgreSQL.

PostgreSQL stores metadata such as:

\- file UUID

\- storage key

\- original filename

\- MIME type

\- size

\- classification

\- uploader

\- ownership context

\- retention metadata

Examples:

\- CV

\- final report

\- university verification evidence

\- organization verification evidence

Storage keys must be random.

Never expose permanent public URLs for private documents.

Download must pass backend authorization.

Sensitive file access should be auditable.

\---

\# 48. File Upload Security

Validate:

\- intended file purpose

\- file size

\- permitted MIME type

\- safe filename handling

Initial policy may include:

\`\`\`text

CV:

PDF only

reasonable max size

Final report:

PDF only

reasonable max size

Verification evidence:

PDF or approved image types

reasonable max size

\`\`\`

Do not accept arbitrary executable or archive uploads merely for convenience.

\---

\# 49. Privacy and Compliance

FursadHub must support:

\- Privacy Policy

\- Terms and Conditions

\- Cookie Notice where applicable

\- Data Retention Policy

\- versioned legal documents

\- terms acceptance records

\- separate consent records where consent is actually needed

\- data-subject/privacy requests

\- audit history

Legal documents support:

\- EN

\- SO

Do not treat Terms acceptance as consent for all possible personal-data processing.

\---

\# 50. Data-Subject Requests

Support:

\`\`\`text

ACCESS

CORRECTION

ERASURE

RESTRICTION

PORTABILITY

OBJECTION

\`\`\`

States:

\`\`\`text

SUBMITTED

IN_REVIEW

COMPLETED

REJECTED

\`\`\`

Manual admin processing is acceptable for the pilot.

\---

\# 51. Audit Logging

Important security/business actions should create append-only audit history.

Examples:

\`\`\`text

LOGIN_SUCCESS

LOGIN_FAILURE

REFRESH_TOKEN_REUSE_DETECTED

STUDENT_VERIFIED

STUDENT_VERIFICATION_REJECTED

STUDENT_VERIFICATION_REVOKED

UNIVERSITY_VERIFIED

ORGANIZATION_VERIFIED

STAFF_ACCOUNT_CREATED

STAFF_ROLE_CHANGED

STAFF_SCOPE_CHANGED

STAFF_PASSWORD_RESET

STAFF_ACCOUNT_SUSPENDED

STAFF_ACCOUNT_REACTIVATED

OPPORTUNITY_PUBLISHED

OPPORTUNITY_CANCELLED

STUDENT_NOMINATED

CANDIDACY_OFFERED

OFFER_ACCEPTED

OFFER_DECLINED

PLACEMENT_STARTED

PLACEMENT_TERMINATED

PLACEMENT_COMPLETED

FINAL_REPORT_APPROVED

DEFENSE_RESULT_RECORDED

PRIVATE_FILE_ACCESSED

\`\`\`

Never silently overwrite meaningful history.

\---

\# 52. PostgreSQL and Flyway

Use PostgreSQL as source of truth.

Use UUID identifiers.

Every schema change must use Flyway.

Do not use \`ddl-auto=update\` in staging or production.

Prefer:

\`\`\`text

spring.jpa.hibernate.ddl-auto=validate

\`\`\`

once migrations establish the schema.

Critical invariants must have PostgreSQL constraints in addition to Java checks.

Important constraints include:

\`\`\`text

UNIQUE(university_id, student_number)

UNIQUE(opportunity_id, student_id)

UNIQUE(opportunity_id, target_university_id)

UNIQUE(candidacy_id) for placement

UNIQUE(placement_id, week_number)

UNIQUE(placement_id, attendance_date)

\`\`\`

Use foreign keys appropriately.

Add indexes for real query patterns, not blindly.

\---

\# 53. Time

Use:

\- \`Instant\` for event timestamps

\- \`LocalDate\` for date-only business concepts

Store timestamp events in UTC.

\---

\# 54. Transactions and Concurrency

Critical workflows must be atomic.

\## Nomination acceptance

One transaction:

\`\`\`text

Accept nomination

\+

Create/Merge candidacy

\`\`\`

\## Offer acceptance

One transaction:

\`\`\`text

Accept offer

\+

Accept candidacy

\+

Create placement

\+

Update availability

\+

Audit

\`\`\`

\## Placement completion

One transaction:

\`\`\`text

Validate requirements

\+

Complete placement

\+

Update availability

\+

Audit

\`\`\`

Handle repeated/concurrent requests so impossible duplicates cannot be created.

\---

\# 55. Notifications

Support:

\- in-app notifications

\- transactional email

Critical business transactions must not depend on SMTP being immediately available.

Use a PostgreSQL-backed notification/outbox pattern for V1.

Do not introduce Kafka or RabbitMQ.

Retry email delivery safely.

\---

\# 56. Internationalization

System UI supports:

\- English

\- Somali

Do not hardcode visible production UI strings in React.

Use translation keys.

Prefer feature-based translation files.

Design components so longer Somali text does not break layout.

User-generated internship content does not need mandatory translation into both languages during the pilot.

\---

\# 57. Brand and Frontend UI

Claude MUST read:

\- \`docs/product/BRAND_AND_UI_GUIDELINES.md\`

Claude must not invent FursadHub's permanent visual identity.

The latest approved branding direction uses the FursadHub bridge-based logo concept. The repository's approved logo asset is the visual source of truth. If exact color hex values are not explicitly documented, do not silently invent permanent brand colors; use centralized temporary tokens and flag them for team confirmation.

Do not:

\- redraw the official logo

\- recolor it without instruction

\- distort it

\- replace it with a generic icon

\- use random colors throughout pages

All UI must use centralized design tokens.

Additional approved branding facts:

\- The exact approved FursadHub logo reference sheet is located at:

\`\`\`text

/mnt/data/ghostwriter_images/context/c22b974b-b966-528c-bdfb-e42ea180a75e.png

\`\`\`

\- The approved logo concept contains:

  - \`FH\` monogram

  - arched doorway

  - open orange door

  - roadway/path extending from the opened door

  - \`FursadHub\` wordmark

  - exact tagline: \`Opening doors to your future.\`

\- The approved working brand palette is:

\`\`\`text

Brand dark / navy:   #091423

Brand orange:        #F8891F

Brand orange deep:   #E56D0E

Off-white / cream:   #FBF6EE

Warm beige support:  #EDCFAE

\`\`\`

\- The main UI should use the supplied light-logo variant on light surfaces and the supplied dark-logo variant on dark surfaces.

\---

\# 58. Motion and Status Feedback

FursadHub should use purposeful micro-interactions and transitions.

Important states may use one-time animations.

Example VERIFIED state:

\`\`\`text

circle appears/scales

        |

checkmark draws/scales

        |

VERIFIED text fades in

        |

animation stops

        |

stable verified state remains

\`\`\`

Use this pattern for meaningful confirmations such as:

\- email verified

\- university enrollment verified

\- organization verified

\- university verified

\- application submitted

\- nomination accepted

\- offer accepted

\- final report approved

\- internship completed

Do not continuously bounce/glow verified badges.

Respect \`prefers-reduced-motion\`.

Prefer transform/opacity animations.

Use one motion language across student, university, organization, and admin areas.

Read the full motion rules in \`docs/product/BRAND_AND_UI_GUIDELINES.md\`.

\---

\# 59. Testing

Backend:

\- JUnit

\- Spring Boot Test

\- Testcontainers PostgreSQL

Frontend:

\- Vitest

\- React Testing Library where useful

End-to-end:

\- Playwright

Prioritize business-critical and security-critical testing over arbitrary coverage percentages.

\---

\# 60. Mandatory Security Tests

Tests MUST prove at least:

\- University Admin can provision an allowed University staff account without requiring prior public self-registration.

\- Organization Admin can provision an allowed Organization staff account without requiring prior public self-registration.

\- University Admin cannot provision `SUPER_ADMIN`, Organization roles, or another `UNIVERSITY_ADMIN`.

\- Organization Admin cannot provision `SUPER_ADMIN`, University roles, or another `ORGANIZATION_ADMIN`.

\- Internal managed staff roles cannot be obtained through public self-registration.

\- Managed staff can authenticate through the normal email/password authentication flow after satisfying required account/contact-verification state.

\- Staff creation stores only a password hash; list/detail APIs never return plaintext or password hash.

\- Tenant Admin A cannot list, mutate, reset credentials for, suspend, or re-scope Tenant B staff.

\- Department coordinator cannot access another department, including another department inside the same university.

\- Department coordinator cannot access University Admin-only APIs.

\- University Supervisor cannot inherit University Admin scope.

\- Recruiter cannot access Organization Admin-only APIs.

\- Organization Supervisor cannot inherit Organization Admin scope.

\- Role-update APIs cannot escalate managed staff to `SUPER_ADMIN` or a cross-domain role.

\- University A cannot access University B restricted records.

\- Recruiter cannot access another organization's candidates.

\- Student cannot download another student's private file.

\- Recruiter cannot access student verification evidence.

\- Unverified student cannot apply.

\- Unverified student cannot be nominated.

\- Duplicate university/student-number identity is blocked.

\- Duplicate candidacy is blocked.

\- Expired verification challenge fails.

\- Consumed verification challenge cannot be reused.

\- Targeted-only opportunity rejects self-application.

\- Only correct organization can manage a candidate.

\- Only candidate student can accept their offer.

\- Offer acceptance creates exactly one placement.

\- Repeated offer acceptance does not create another placement.

\- Revoked refresh token cannot refresh.

\- Refresh-token replay triggers family revocation.

\- Suspended account cannot authenticate/use refresh flow.

\---

\# 61. CI/CD

Every pull request must run required checks.

Backend:

\`\`\`text

compile

unit tests

integration tests

Flyway/database verification

package/build

\`\`\`

Frontend:

\`\`\`text

npm ci

lint

TypeScript typecheck

unit tests

production build

\`\`\`

Broken CI blocks merge.

\---

\# 62. Git Workflow

\`main\` is protected.

Normal feature work uses branches such as:

\`\`\`text

feat/student-verification

feat/create-opportunity

fix/department-authorization

chore/dependency-upgrade

\`\`\`

Require:

\- pull request

\- at least one review

\- successful CI

\- resolved review discussions

Do not directly push normal feature work to \`main\`.

\---

\# 63. Environments

Use:

\`\`\`text

LOCAL

CI

STAGING

PRODUCTION

\`\`\`

Never copy real production student data into staging.

Staging uses synthetic data.

\`main\` may deploy automatically to staging.

Production requires explicit human approval.

\---

\# 64. Secrets

Never commit:

\- production DB credentials

\- SMTP passwords

\- storage credentials

\- JWT private keys

\- raw access/refresh tokens

\- reset tokens

\- verification tokens

\- admin credentials

Commit:

\`\`\`text

.env.example

\`\`\`

Ignore:

\`\`\`text

.env

\`\`\`

\---

\# 65. Local Development

Default ports unless conflict exists:

\`\`\`text

Frontend:   5173

Backend:    8080

PostgreSQL: 5432

\`\`\`

API:

\`\`\`text

http\://localhost:8080/api/v1

\`\`\`

Docker Compose should provide local dependencies such as:

\- PostgreSQL

\- S3-compatible object storage

\- local mail catcher

React and Spring Boot development servers may run on the host for fast reload.

\---

\# 66. Docker and Deployment

Create production images for:

\`\`\`text

fursadhub-api

fursadhub-web

\`\`\`

Use immutable tags such as a Git commit SHA.

Do not rely only on \`latest\`.

Pilot infrastructure does not require Kubernetes.

\---

\# 67. Backup and Restore

Production PostgreSQL must have automated backups.

Initial retention target:

\`\`\`text

7 daily

4 weekly

3 monthly

\`\`\`

Backups must exist outside the primary host failure domain.

Periodically restore a backup into a temporary PostgreSQL instance and verify it.

A backup is not considered proven until restoration has succeeded.

\---

\# 68. Monitoring and Logging

Use Spring Boot Actuator.

Monitor:

\- application availability

\- API health

\- repeated HTTP 500 failures

\- database availability

\- backup failures

\- email delivery failures

\- resource exhaustion

Do not publicly expose sensitive Actuator endpoints.

Use structured logs with appropriate:

\- timestamp

\- level

\- request ID

\- method/path

\- status

\- duration

\- safe identifiers

\- event name

Never log:

\- passwords

\- access JWTs

\- refresh tokens

\- reset tokens

\- verification tokens

\- Authorization headers

\- document contents

\- private signing keys

\- DB/storage secrets

Use request/correlation IDs.

\---

\# 69. Billing Readiness

The pilot is FREE.

Do NOT implement real billing until explicitly instructed.

Do NOT implement now:

\- Stripe

\- PayPal

\- mobile-money charging

\- payment cards

\- checkout

\- invoices

\- paid subscriptions

\- payment webhooks

\- payment retries

The code must nevertheless remain billing-ready.

Future billing is a separate bounded domain.

Possible future concepts:

\`\`\`text

BillingAccount

Plan

Subscription

PlanEntitlement

UsageRecord

InvoiceReference

BillingEvent

\`\`\`

Potential billed account types:

\- organization

\- university

Do not assume students must pay for core internship participation.

\---

\# 70. Authorization vs Entitlement

Keep these separate.

Authorization:

_> Is this user allowed to act on this resource?_

Entitlement:

_> Does this organization's/university's plan include this commercial feature?_

Never create roles such as:

\`\`\`text

PRO_RECRUITER

PREMIUM_UNIVERSITY_ADMIN

PAID_ORGANIZATION_ADMIN

\`\`\`

Do not scatter checks like:

\`\`\`java

if (organization.getPlan().equals("PRO")) {

    ...

}

\`\`\`

through core business code.

Future commercial access should use centralized abstractions such as:

\`\`\`text

EntitlementService

UsageLimitService

\`\`\`

Do not activate commercial restrictions during the free pilot unless explicitly instructed.

\---

\# 71. Billing Provider Independence

When billing eventually exists:

\- core domains must not depend directly on Stripe/another provider

\- provider SDK code belongs inside billing infrastructure

\- use generic provider IDs internally where needed

\- payment webhooks must be idempotent and signature-validated

Do not implement a billing provider now.

\---

\# 72. Feature Flags

Feature flags and billing entitlements are different.

Feature flag:

_> Is this feature enabled for this environment/product rollout?_

Entitlement:

_> Has this account's commercial plan granted this feature?_

Keep them separate.

Do not build a complex feature-flag platform for V1.

\---

\# 73. ADRs

Maintain Architecture Decision Records.

Initial ADRs:

\`\`\`text

ADR-001-modular-monolith.md

ADR-002-postgresql.md

ADR-003-jwt-authentication.md

ADR-004-private-object-storage.md

ADR-005-university-attestation.md

ADR-006-billing-ready-architecture.md

ADR-007-frontend-design-system.md

\`\`\`

\---

\# 74. Definition of Done

A feature is not complete because Claude generated code.

A feature is done when:

\- requirements are satisfied

\- authorization is correct

\- business validation exists

\- database constraints are considered

\- migrations exist where required

\- backend tests pass

\- security-sensitive integration tests exist

\- frontend tests exist where valuable

\- API contract is documented

\- standard errors are used

\- English/Somali UI is handled

\- brand/design-system rules are followed

\- reduced-motion/accessibility is considered

\- audit implications are considered

\- privacy implications are considered

\- CI passes

\- human code review happens

\- staging validation occurs where applicable

\---

\# 75. Claude Rules

Claude MUST NOT:

\- invent new domain states

\- redesign frozen state machines

\- introduce microservices

\- introduce unnecessary infrastructure

\- disable tests to make CI pass

\- weaken authorization to satisfy tests

\- bypass Flyway

\- expose JPA entities through REST

\- store access JWTs in localStorage

\- store raw refresh/reset/verification tokens

\- expose private object-storage URLs

\- commit secrets

\- silently break API contracts

\- refactor unrelated modules during focused work

\- add dependencies without justification

\- rely on frontend authorization for security

\- require internal university/organization staff to self-register as Student/University/Organization before staff provisioning

\- authorize managed staff from role string or tenant equality alone

\- let tenant admins assign `SUPER_ADMIN`, their own admin role, or cross-domain staff roles

\- expose generated staff passwords after the one-time creation/reset response

\- implement biometrics

\- implement billing unless explicitly instructed

\- invent FursadHub's permanent colors/logo/typography

\- create random page-by-page animation styles

Claude MUST:

\- read this file before significant work

\- read relevant docs

\- inspect existing code before editing

\- preserve established architecture

\- keep diffs focused

\- use PostgreSQL constraints for critical invariants

\- use Spring Security framework capabilities where appropriate

\- enforce managed staff authorization from current membership + role + resource scope

\- keep public self-registration separate from tenant-admin managed staff provisioning

\- treat managed staff provisioning as production functionality across LOCAL/CI/STAGING/PRODUCTION

\- write tests

\- explain migrations

\- explain security-sensitive decisions

\- follow approved brand/design-system tokens

\- support English/Somali UI

\- report files changed

\- report tests/commands run

\- report unresolved risks

\- stop after the requested phase

\---

\# 76. Claude Work Process

For every implementation phase/task:

1\. Read \`CLAUDE.md\`.

2\. Read the relevant architecture/product docs.

3\. Inspect the current repository.

4\. Restate the requested scope briefly.

5\. Identify security-sensitive areas.

6\. Identify migration/database needs.

7\. Identify frontend brand/design implications.

8\. Create a concise implementation plan.

9\. Implement only requested scope.

10\. Add Flyway migrations where required.

11\. Add appropriate unit/integration tests.

12\. Run backend tests/build.

13\. Run frontend lint/typecheck/tests/build when relevant.

14\. Review the Git diff.

15\. Remove unrelated changes.

16\. Report:

   - completed work

   - backend changes

   - frontend changes

   - database changes

   - security decisions

   - design-system decisions

   - tests and commands

   - changed files

   - known limitations

   - next recommended phase

Do NOT automatically begin the next phase.
