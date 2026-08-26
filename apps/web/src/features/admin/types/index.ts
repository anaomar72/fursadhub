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
  usersByStatus: Record<string, number>
  universities: number
  organizationsByVerificationStatus: Record<string, number>
  opportunitiesByStatus: Record<string, number>
  candidacies: number
  placementsByStatus: Record<string, number>
  openPrivacyRequests: number
  escalatedVerificationCases: number
  failedEmailDeliveries: number
  recentLoginFailures: number
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
