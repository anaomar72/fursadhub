/** Phase 7 platform-administration contracts (CLAUDE.md sections 23-24, 31, 49-51). */

export type PlatformRole = 'SUPER_ADMIN' | 'VERIFICATION_OFFICER'

/**
 * The caller's own platform roles.
 *
 * Drives NAVIGATION only. Every admin endpoint re-authorizes independently against current
 * PostgreSQL data — a frontend route guard is UX, never security (CLAUDE.md section 24).
 */
export interface AdminSession {
  platformAdmin: boolean
  roles: PlatformRole[]
}

export interface PlatformAdminGrant {
  id: string
  userId: string
  email: string | null
  role: PlatformRole
  grantedAt: string
  revokedAt: string | null
  active: boolean
}

/**
 * A managed platform verification officer (Backend Phase B5.6).
 *
 * `username` is null for an officer granted the role before B5.6, who still signs in with their
 * email — that null is what the console keys the "assign username" action on, so it is meaningful
 * rather than missing.
 *
 * There is deliberately no password field of any kind. The server never returns one here.
 */
export interface VerificationOfficer {
  userId: string
  displayName: string | null
  username: string | null
  email: string
  role: PlatformRole
  status: UserStatus
}

/**
 * A one-time temporary password for a platform officer (Backend Phase B5.6).
 *
 * Distinct from the organization/university `TemporaryCredentialResponse`, which carries a
 * `membershipId` — a platform officer has no tenant and therefore no membership.
 *
 * `temporaryPassword` is shown once and then discarded. It must never be written to localStorage,
 * sessionStorage, a URL, or a long-lived query cache (CLAUDE.md section 26A).
 */
export interface PlatformTemporaryCredential {
  userId: string
  username: string
  email: string
  temporaryPassword: string
}

export type UserStatus = 'PENDING_CONTACT_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

export interface AdminUser {
  id: string
  email: string
  status: UserStatus
  preferredLocale: string
  emailVerifiedAt: string | null
  createdAt: string
}

export type InstitutionVerificationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_CHANGES'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REVOKED'

export interface AdminOrganization {
  id: string
  name: string
  slug: string
  type: string
  registrationNumber: string | null
  website: string | null
  verificationStatus: InstitutionVerificationStatus
  verifiedAt: string | null
  /** Whether a license document is on file — a flag, not a file id (CLAUDE.md section 47). */
  hasEvidence: boolean
  evidenceUploadedAt: string | null
  createdAt: string
}

export interface AdminUniversity {
  id: string
  name: string
  slug: string
  city: string | null
  registrationNumber: string | null
  website: string | null
  verificationStatus: InstitutionVerificationStatus
  hasEvidence: boolean
  evidenceUploadedAt: string | null
  verifiedAt: string | null
  createdAt: string
}

export interface EscalatedCase {
  caseId: string
  status: string
  universityId: string
  departmentId: string
  studentEmail: string | null
  studentNumber: string
  program: string
  academicYear: string
  /** A boolean, not a file id — the document is fetched through its own audited route. */
  hasEvidence: boolean
  escalatedAt: string
  escalationReason: string | null
  reviewNotes: string | null
  submittedAt: string
}

export interface AuditEvent {
  id: string
  occurredAt: string
  eventType: string
  userId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: string | null
}

/** Counts only — nothing here identifies a person or exposes a single record. */
export interface PlatformStatistics {
  /** EVERY account by status — students, tenant staff and platform staff alike. Not "students". */
  usersByStatus: Record<string, number>
  /** Backend Phase B6. Rows in `student_profiles` — the real student population. */
  studentProfiles: number
  /** Backend Phase B6. Enrolments by verification status; one enrolment per student. */
  studentEnrollmentsByVerificationStatus: Record<string, number>
  /** Every university row, in any verification state. */
  universities: number
  /** Backend Phase B6. The same universities, split by verification status. */
  universitiesByVerificationStatus: Record<string, number>
  organizationsByVerificationStatus: Record<string, number>
  /** Opportunities by their STORED state. `PUBLISHED` here does not mean anyone can see it. */
  opportunitiesByStatus: Record<string, number>
  /**
   * Backend Phase B6. Opportunities a visitor can actually find right now: PUBLISHED, PUBLIC/HYBRID,
   * and owned by a currently VERIFIED organization. Usually SMALLER than
   * `opportunitiesByStatus.PUBLISHED`, and the gap is the listings B1.5 hides.
   */
  publiclyDiscoverableOpportunities: number
  candidacies: number
  placementsByStatus: Record<string, number>
  openPrivacyRequests: number
  escalatedVerificationCases: number
  failedEmailDeliveries: number
  recentLoginFailures: number
}

export type OpportunityStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'CANCELLED'
export type OpportunityMode = 'PUBLIC' | 'UNIVERSITY_TARGETED' | 'HYBRID'

/**
 * One opportunity in the Super Admin oversight table (Backend Phase B6).
 *
 * Read-only. There is no mutation endpoint behind any of these fields, and nothing here describes a
 * person — no applicants, no candidacy counts, no student data, no file identifiers.
 */
export interface AdminOpportunity {
  id: string
  organizationId: string
  organizationName: string
  organizationVerificationStatus: string
  title: string
  status: OpportunityStatus
  mode: OpportunityMode
  workMode: string
  location: string | null
  numberOfOpenings: number
  startDate: string | null
  endDate: string | null
  applicationDeadline: string | null
  createdAt: string
  publishedAt: string | null
  /** Whether the public site shows this right now — not the same as `status === 'PUBLISHED'`. */
  publiclyDiscoverable: boolean
}

export interface AdminOpportunityDetail {
  summary: AdminOpportunity
  description: string | null
  responsibilities: string | null
  requirements: string | null
  compensation: {
    type: string
    currencyCode: string | null
    minimumAmount: number | null
    maximumAmount: number | null
    period: string | null
  } | null
  skills: string[]
  perks: string[]
  hoursPerWeek: number | null
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
