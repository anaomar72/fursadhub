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
  createdAt: string
  updatedAt: string
}

export interface OrganizationSummaryResponse {
  id: string
  name: string
  slug: string
  type: OrganizationType
}

export interface MyOrganizationMembershipResponse {
  organizationId: string
  role: OrganizationRole
}

export interface OrganizationMemberResponse {
  membershipId: string
  email: string | null
  role: OrganizationRole
}
