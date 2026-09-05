export type UniversityRole = 'UNIVERSITY_ADMIN' | 'DEPARTMENT_COORDINATOR' | 'UNIVERSITY_SUPERVISOR'

export type InstitutionVerificationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_CHANGES'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REVOKED'

export interface UniversityResponse {
  id: string
  name: string
  slug: string
  city: string | null
  status: string
}

/** Management view of a university — its own staff, and the registering user. */
export interface UniversityDetailResponse {
  id: string
  name: string
  slug: string
  city: string | null
  /**
   * Backend Phase B2, additive. Serialized with `non_null`, so an unset field is ABSENT.
   *
   * Update semantics on `PATCH /universities/{id}` differ by field age, deliberately: these two B2
   * fields are PRESENCE-AWARE — omit one and the stored value is kept; send `null` (or an empty
   * string) to clear it — while the older `city` / `registrationNumber` / `website` /
   * `description` keep FULL REPLACEMENT, where omitting still CLEARS.
   */
  countryCode?: string | null
  publicContactEmail?: string | null
  hasCover: boolean
  coverUploadedAt?: string | null
  registrationNumber: string | null
  website: string | null
  description: string | null
  status: InstitutionVerificationStatus
  hasEvidence: boolean
  evidenceUploadedAt: string | null
  hasLogo: boolean
  logoUploadedAt: string | null
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UniversityEvidenceResponse {
  present: boolean
}

/**
 * What anyone browsing FursadHub — signed in or not — sees of a university (Phase 8, enriched in
 * Backend Phase B2). Optional fields are ABSENT rather than null when unset (`non_null`).
 */
export interface PublicUniversityResponse {
  id: string
  name: string
  slug: string
  city: string | null
  countryCode?: string | null
  website: string | null
  description: string | null
  /** An address the university chose to publish — never a staff account email. */
  publicContactEmail?: string | null
  verified: boolean
  hasLogo: boolean
  hasCover: boolean
}

/**
 * One row of the public university directory (Backend Phase B1, enriched in B2). Deliberately
 * carries no contact address — that belongs on a profile page someone chose to open.
 */
export interface PublicUniversitySummaryResponse {
  id: string
  name: string
  slug: string
  city: string | null
  countryCode?: string | null
  description?: string | null
  website?: string | null
  verified: boolean
  hasLogo: boolean
  hasCover: boolean
}

export interface DepartmentResponse {
  id: string
  universityId: string
  name: string
  code: string
}

export interface MyMembershipResponse {
  universityId: string
  role: UniversityRole
  departmentIds: string[]
}

export type UserAccountStatus = 'PENDING_CONTACT_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

export interface StaffMemberResponse {
  membershipId: string
  /** Backend Phase B5. Null for staff created before B5; the UI falls back to email. */
  displayName: string | null
  /** Backend Phase B5.5. The login identifier; null for a legacy account still signing in by email. */
  username: string | null
  userId: string
  email: string | null
  role: UniversityRole
  status: UserAccountStatus | null
  departmentIds: string[]
  assignedAt: string
}

/** A server-generated temporary credential, returned exactly once after a staff password reset. */
export interface TemporaryCredentialResponse {
  membershipId: string
  email: string
  temporaryPassword: string
}

export interface StudentRowResponse {
  studentUserId: string
  email: string | null
  enrollmentId: string
  departmentId: string
  studentNumber: string
  program: string
  academicYear: string
  verificationStatus: string
}

export interface VerificationCaseResponse {
  id: string
  enrollmentId: string
  status: string
  reviewNotes: string | null
  submittedAt: string | null
  reviewedAt: string | null
  studentEmail: string | null
  universityId: string | null
  departmentId: string | null
  studentNumber: string | null
  program: string | null
  academicYear: string | null
  /**
   * Phase 7. A boolean, not a file id: the evidence is fetched through its own audited route on the
   * owning case, and publishing a file id would imply a generic file endpoint that does not exist.
   */
  hasEvidence: boolean
  /** Set when a university has handed this case to the platform. Not a status — the state machine is unchanged. */
  escalatedAt: string | null
  escalationReason: string | null
}
