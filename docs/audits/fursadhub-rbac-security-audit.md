# FursadHub RBAC and privileged-assignment audit

Date: 2026-10-11. Reviewed baseline: 4b7b9ab. Status: source-based initial audit; no backend changes, privilege mutations, production exploitation, or live authorization certification. Paths below are repository-relative; line numbers refer to this baseline.

## 1. Executive summary

The inspected authorization model is more differentiated than a single broad staff role: organization recruiting excludes supervisors, university coordinators have department scope, and placement supervisors require assignments. Backend services re-read membership/grant records. Client route guards are presentation safeguards only.

The reported ability to grant a privileged platform role to an existing ordinary active account is confirmed in backend code. This is a super-admin-authorized capability, not demonstrated self-escalation by an ordinary user. Whether it violates policy depends on the intended separation between public and privileged identities. The generic grant path and dedicated managed-officer provisioning path enforce different eligibility rules.

No cross-tenant exploit or unauthorized privilege escalation was demonstrated. Potential concurrency, suspension and audit-outcome issues below require dedicated tests. This audit is scoped to the inspected authorization and provisioning paths, not every endpoint in the application.

## 2. Current role inventory

| Context | Roles / identity | Source |
|---|---|---|
| Student | Owning user/student/enrollment context; not a platform-admin enum role | placement/application/PlacementAuthorization.java:94; candidacy/application/CandidacyAuthorization.java:58 |
| Organization | ORGANIZATION_ADMIN, RECRUITER, ORGANIZATION_SUPERVISOR | apps/api/src/main/java/com/fursadhub/organization/domain/OrganizationRole.java:4 |
| University | UNIVERSITY_ADMIN, DEPARTMENT_COORDINATOR, UNIVERSITY_SUPERVISOR | apps/api/src/main/java/com/fursadhub/university/domain/UniversityRole.java:4 |
| Platform | SUPER_ADMIN, VERIFICATION_OFFICER | apps/api/src/main/java/com/fursadhub/administration/domain/PlatformRole.java:12 |

Unless otherwise stated, abbreviated Java paths in this report are beneath apps/api/src/main/java/com/fursadhub/.

## 3. Permission enforcement model

SecurityConfig.java:39 (common/config) creates a stateless JWT resource server. Public/auth routes are permitted; remaining requests require authentication. Domain service checks provide the resource authorization, so authentication alone is insufficient.

- administration/application/PlatformAuthorization.java:59,64,77: super-admin vs reviewer checks; ACTIVE account and current active database grants. Reviewer means SUPER_ADMIN or VERIFICATION_OFFICER.
- organization/application/OrganizationAuthorization.java:30: active membership at the specified organization plus optional role allowlist.
- university/application/UniversityAuthorization.java:34,52: active membership, optional roles and assigned department scope; university admins have whole-university scope.
- candidacy/application/CandidacyAuthorization.java:29,42,49,58: organization admin/recruiter access to the resource's organization; owning-student check for private candidacy access.
- placement/application/PlacementAuthorization.java:110,132,151: student ownership, tenant membership and coordinator/assigned-supervisor distinctions. Follow-up validation must exercise each calling service rather than assume the helper is always invoked correctly.
- internshipmanagement/application/InternshipManagementAuthorization.java:143,167,182,204,231,251,268: academic access, completion, policy, assigned organization-supervisor writes and separate academic/workplace read scope.
- Frontend src/app/router/index.tsx wraps routes with RequireAuth and role-specific capability guards. Keep these consistent for UX, but never treat them as security enforcement.

## 4. Tenant and resource boundaries

OrganizationMembershipService.java:83,126,258,289 (organization/application) gates staff operations on the actor's organization-admin membership, restricts assignable roles, resolves membership ownership and protects admin targets. UniversityStaffService.java:296,335,367,404,428 (university/application) similarly checks tenant ownership and department assignment; assigned departments must belong to the same university. Inspect these exact functions when writing tests, as source line positions can change.

Placement access derives organization/university/department from the placement, not a client-supplied tenant assertion. University supervisor and organization supervisor reads use active assignments. Academic records are separated from workplace records; organization attendance/evaluation authorship uses requireAssignedOrganizationSupervisor, not generic recruiter authority.

These are positive source findings. They do not prove all list queries, attachments, bulk operations or future endpoints preserve the same scope.

## 5. Confirmed behavior and design-policy issues

### R1 — Generic platform grants do not enforce staff-identity eligibility

Classification: confirmed backend behavior / policy weakness; provisional Medium risk, potentially High impact if separation-of-duties is required. Not an unauthenticated vulnerability.

Evidence:

- administration/api/AdminController.java:141: POST /api/v1/admin/platform-roles forwards userId and role to PlatformAdminService.grant.
- administration/api/GrantPlatformRoleRequest.java:8: userId and PlatformRole must be non-null; the role enum includes SUPER_ADMIN and VERIFICATION_OFFICER.
- administration/application/PlatformAdminService.java:55–76: requires acting super-admin; requires target exists and is ACTIVE; returns an existing grant or creates the grant and audit event. No student-profile, tenant-membership, username/managed-identity, conflict-of-interest or second-approver check in this path.
- apps/api/src/test/java/com/fursadhub/administration/PlatformAuthorizationIT.java:94–110 explicitly grants an officer role to a self-registered active user and expects it to become effective on their existing token. Test source was read; it was not executed in this audit.

Impact: an authorized administrator can grant platform review authority to a public/student/tenant account, combining unrelated responsibilities on one identity. Generic grants can also grant SUPER_ADMIN. This is materially broader than dedicated managed-officer creation, which fixes the role to VERIFICATION_OFFICER.

Future remediation: first decide whether existing-account grants are a supported legacy migration or prohibited policy. If prohibited, enforce target eligibility and incompatible-role rules server-side across every grant path, define a migration strategy, and consider two-person approval/step-up authentication for privileged assignments. Do not just remove a UI option.

### R2 — Officer management eligibility is based on grants, not provenance

Classification: confirmed identity-management design behavior; provisional Medium policy risk.

Evidence: administration/application/PlatformAccountService.java:170 assignUsername and :273 requireManagedOfficerTarget. The target must hold VERIFICATION_OFFICER, must not also hold SUPER_ADMIN, and must not be CLOSED. There is no check here that the identity originated from managed-officer creation. Source comments explicitly describe conversion of legacy self-registered officers. assignUsername changes the account's login identifier; it is not a separate isolated staff identity.

Impact: an account accepted by R1 can subsequently enter the managed-officer identity workflow. This is an intentional legacy path in comments, so it must be reconciled with product policy rather than called an accidental bypass without evidence.

Future remediation: make identity provenance/allowed transitions explicit; warn and audit any identity conversion; define what should happen to existing student and tenant memberships. Preserve existing behavior during this redesign.

## 6. Potential issues requiring validation

| ID | Potential issue | Evidence and uncertainty | Provisional impact |
|---|---|---|---|
| P1 | Concurrent revocations could remove the last two super-admin grants | PlatformAdminService.java:98,118 reads other grants then revokes; no locking is visible in this method. Database isolation/other constraints need review and concurrent integration proof. | High administrative availability if reproduced |
| P2 | Success-shaped audit events can survive a failed business transaction | common/audit/AuditService.java:25 uses REQUIRES_NEW; PlatformAdminService.java:73–75 records GRANTED after save but before outer commit. A later rollback could leave a success event without a committed grant. No rollback experiment performed. | Medium audit-integrity risk |
| P3 | Global suspension may not be uniformly rechecked by all tenant paths using an existing JWT | PlatformAuthorization checks ACTIVE explicitly; OrganizationAuthorization/UniversityAuthorization check active membership. JwtSupport.java:88–101 validates token issuer/audience/time rather than current account state. End-to-end suspension behavior and membership updates must be traced before drawing a conclusion. | Potential High if suspended identities retain sensitive access |
| P4 | Reviewer conflict-of-interest boundaries are unclear | Platform reviewers have broad institution-review authority; this review has not proved whether individual decision services prevent reviewing one's own affiliated institution or case. | Policy-dependent |

Role grouping alone is not proof of a vulnerability. A reviewer role may intentionally be platform-wide; recruiter and supervisor responsibilities are already separated in inspected services.

## 7. Evidence and verification limits

Source files and functions above are the evidence. No real user roles were changed. No authentication tokens, credentials, private documents or private user records were copied into this report. The available local browser was signed out; public directories and profile covers were inspected only. Backend health returned 200, which does not certify authorization. Backend integration test assertions were inspected, not run.

Existing tests worth preserving include PlatformAuthorizationIT (ordinary-user denial, officer self-promotion denial, immediate grants/revocation, last-admin protection, suspended admin) and PlatformVerificationOfficerIT (managed-officer provisioning/protected targets). Frontend capability tests cannot substitute for these server tests.

## 8. Severity interpretation

R1/R2 require an already-authorized super-admin and an unresolved eligibility policy; they are not evidence of ordinary-user account takeover. P1–P4 are hypotheses with source evidence, not confirmed exploits. Severity must be finalized after intended policy and reproducible isolated tests are available.

## 9. Safe reproduction conditions

Use a disposable PostgreSQL/Testcontainers environment, ephemeral test users, synthetic institutions and no production credentials.

1. Create an active public/student test account and separate super-admin test actor.
2. Call the generic grant endpoint as the super-admin with VERIFICATION_OFFICER; inspect the committed grant and reviewer access using the target's pre-existing test token.
3. Repeat as ordinary student and verification officer actors; expect denial and unchanged grants.
4. Repeat for inactive targets and a target holding tenant staff memberships; record actual eligibility behavior separately from proposed policy.
5. Test managed identity conversion only on disposable accounts; verify which identifier authenticates and whether unrelated memberships persist.
6. For P1, coordinate two transactions against two remaining admin grants; verify at least one usable ACTIVE administrator remains. For P2, inject rollback after the audit call and compare committed state to event outcome. Never run either experiment against the local user's actual accounts.

## 10. Future remediation priorities

Resolve privileged eligibility and identity-separation policy first. Then implement explicit server-side eligibility predicates, conflict checks and safe migration. Add transaction-safe last-admin invariants and accurate audit outcome semantics if tests confirm P1/P2. Review suspension enforcement consistently across services. Keep all of this in a separate backend/security change, not hidden inside a visual redesign.

## 11. Proposed permission-matrix design (future, not implemented)

Use named capabilities evaluated against current actor state and resource scope; do not put enduring grants solely into a JWT or trust frontend booleans.

| Responsibility | Proposed capability family | Required scope |
|---|---|---|
| Student | application.submit/read-own, placement.read-own, academic.submit-own | Own user/enrollment; existing lifecycle prerequisites |
| Recruiter | opportunity.manage, candidate.review, placement.manage | Current organization; preserve existing eligibility/state rules |
| Organization supervisor | placement.read-assigned, attendance.record, evaluation.author | Active assignment of correct type; current organization |
| University admin | institution.manage, staff.manage, academic.coordinate | Own university; protected admin identity |
| Department coordinator | student.verify, nomination.manage, academic.coordinate | Explicit active departments within own university |
| University supervisor | academic.review-assigned | Assigned placements and required academic scope |
| Verification officer | institution.review, escalation.review | Explicit platform-review policy and conflict-of-interest exclusions |
| Super-admin | platform.accounts.manage, platform.grants.manage, audit.read | Active platform grant; target eligibility; optional approval requirements |

This is a policy proposal, not a claim that every named capability exists or should be added during UI work. Map each to actual endpoints and approval decisions before implementation.

## 12. Suggested automated authorization tests

- Actor × target × operation matrix: anonymous, student, each tenant role, reviewer and super-admin.
- Same tenant/different tenant; same department/other department; assigned/unassigned/removed assignment.
- Active/suspended/closed account, active/revoked membership, pre-existing token after each change.
- Direct endpoint requests despite hidden frontend controls; verify no mutation on denied requests.
- Cross-tenant IDs in path and payload, private evidence download, list counts/pagination and bulk operations.
- Generic platform grants to public/student/managed/dual-role accounts, exact policy outcomes and audit records.
- Concurrent grant/revoke, last usable admin, rollback/audit consistency and no leaked temporary credentials.
- Maintain frontend route/nav tests separately to catch UX drift without mistaking them for server security.

## 13. Audit logging recommendations

Existing grant/revoke and staff-management operations record actor and metadata through AuditService. Retain them. Add structured actor, target, capability, tenant/scope, old/new grants, correlation ID, approval/reason and attempted/committed/denied outcomes as policy permits. Ensure failed transaction events cannot be mistaken for committed grants. Audit denied privileged actions and assignment conflicts without logging passwords, tokens or private document content. Define retention, immutable access controls and reviewer access to security events.

## 14. Unresolved product-policy decisions

- May a student or tenant employee hold platform review authority on the same identity?
- Is generic existing-account assignment a permanent feature or a migration-only path?
- Are reviewer accounts dedicated identities? What evidence makes an account eligible?
- Can a reviewer decide cases involving an affiliated institution? Who assigns reviewer scope?
- Which grants require a second approver, step-up authentication or time limits?
- Must suspension invalidate every existing access token immediately, and across which capabilities?
- What is the protected invariant: last grant, last active account, or last administrator able to authenticate?
- How are tenant admin succession and emergency recovery authorized and audited?

No fixes were implemented. This report must be extended with endpoint-by-endpoint coverage and isolated authorization execution before claiming a completed security assurance review.
