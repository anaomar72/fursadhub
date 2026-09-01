export type OrganizationType = 'COMPANY' | 'NGO' | 'GOVERNMENT' | 'OTHER'

export type OrganizationRole = 'ORGANIZATION_ADMIN' | 'RECRUITER' | 'ORGANIZATION_SUPERVISOR'

export type InstitutionVerificationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_CHANGES'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REVOKED'

export interface OrganizationResponse {
  id: string
  name: string
  slug: string
  type: OrganizationType
  registrationNumber: string | null
  website: string | null
  description: string | null
  verificationStatus: InstitutionVerificationStatus
  verifiedAt: string | null
  /** Whether a license document is currently attached — not a file id (CLAUDE.md section 47). */
  hasEvidence: boolean
  evidenceUploadedAt: string | null
  hasLogo: boolean
  logoUploadedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OrganizationEvidenceResponse {
  present: boolean
}

/** What anyone browsing FursadHub — signed in or not — sees of an organization (Phase 8). */
export interface PublicOrganizationResponse {
  id: string
  name: string
  slug: string
  type: OrganizationType
  website: string | null
  description: string | null
  verified: boolean
  hasLogo: boolean
}

export interface OrganizationSummaryResponse {
  id: string
  name: string
  slug: string
  type: OrganizationType
  verified: boolean
}

export interface MyOrganizationMembershipResponse {
  organizationId: string
  role: OrganizationRole
}

export type UserAccountStatus = 'PENDING_CONTACT_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

export interface OrganizationMemberResponse {
  membershipId: string
  email: string | null
  role: OrganizationRole
  status: UserAccountStatus | null
}

/** A server-generated temporary credential, returned exactly once after a staff password reset. */
export interface TemporaryCredentialResponse {
  membershipId: string
  email: string
  temporaryPassword: string
}
