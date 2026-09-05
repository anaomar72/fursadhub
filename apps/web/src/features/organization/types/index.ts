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
  /**
   * Backend Phase B2 profile fields, additive. The API serializes with `non_null`, so an unset
   * field is ABSENT rather than null — hence `?` as well as `| null`.
   *
   * Update semantics on `PATCH /organizations/{id}` differ by field age, deliberately:
   * - these B2 fields are PRESENCE-AWARE — omit one and the stored value is kept; send `null` (or
   *   an empty string) to clear it. A form that does not know about a field cannot destroy it.
   * - the older `registrationNumber` / `website` / `description` keep FULL REPLACEMENT — omitting
   *   one still CLEARS it, so a form editing those must submit every one it wants kept.
   *
   * They are readable here, and not only on the public DTO, because the management form has to
   * display what it edits.
   */
  industry?: string | null
  city?: string | null
  countryCode?: string | null
  shortDescription?: string | null
  companySizeRange?: CompanySizeRange | null
  foundedYear?: number | null
  linkedinUrl?: string | null
  xUrl?: string | null
  instagramUrl?: string | null
  youtubeUrl?: string | null
  hasCover: boolean
  coverUploadedAt?: string | null
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

/** Organization size as a BAND, never an exact headcount (Backend Phase B2). */
export type CompanySizeRange =
  | 'SIZE_1_10'
  | 'SIZE_11_50'
  | 'SIZE_51_200'
  | 'SIZE_201_500'
  | 'SIZE_501_1000'
  | 'SIZE_1001_5000'
  | 'SIZE_5001_PLUS'

export interface OrganizationEvidenceResponse {
  present: boolean
}

/**
 * What anyone browsing FursadHub — signed in or not — sees of an organization (Phase 8, enriched in
 * Backend Phase B2). Optional fields are ABSENT rather than null when unset (`non_null`).
 */
export interface PublicOrganizationResponse {
  id: string
  name: string
  slug: string
  type: OrganizationType
  industry?: string | null
  city?: string | null
  countryCode?: string | null
  shortDescription?: string | null
  website: string | null
  description: string | null
  companySizeRange?: CompanySizeRange | null
  foundedYear?: number | null
  linkedinUrl?: string | null
  xUrl?: string | null
  instagramUrl?: string | null
  youtubeUrl?: string | null
  verified: boolean
  hasLogo: boolean
  hasCover: boolean
}

/**
 * One row of the public organization directory (Backend Phase B1, enriched in B2). Deliberately
 * card-scoped: size, founded year and social links live on the profile response, not here.
 */
export interface PublicOrganizationSummaryResponse {
  id: string
  name: string
  slug: string
  type: OrganizationType
  industry?: string | null
  city?: string | null
  countryCode?: string | null
  shortDescription?: string | null
  description?: string | null
  website?: string | null
  verified: boolean
  hasLogo: boolean
  hasCover: boolean
  openOpportunityCount: number
}

export interface OrganizationSummaryResponse {
  id: string
  name: string
  slug: string
  type: OrganizationType
  verified: boolean
  /**
   * Backend Phase B1, additive. Whether a logo is on file — a flag, not a file id (CLAUDE.md
   * section 47). Lets a card decide whether to render the public logo route or fall back to
   * initials, instead of requesting an image that is known not to exist.
   */
  hasLogo: boolean
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
