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
