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

/** What anyone browsing FursadHub — signed in or not — sees of a university (Phase 8). */
export interface PublicUniversityResponse {
  id: string
  name: string
  slug: string
  city: string | null
  website: string | null
  description: string | null
  verified: boolean
  hasLogo: boolean
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
