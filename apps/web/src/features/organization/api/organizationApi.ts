import { env } from '../../../app/config/env'
import { ApiError, apiFetch } from '../../../lib/api/client'
import { getAccessToken } from '../../../lib/auth/tokenStore'
import type {
  MyOrganizationMembershipResponse,
  OrganizationEvidenceResponse,
  OrganizationMemberResponse,
  OrganizationResponse,
  OrganizationRole,
  OrganizationType,
  PublicOrganizationResponse,
  TemporaryCredentialResponse,
} from '../types'
import type { MessageResponse } from '../../auth/types'

export function createOrganization(input: {
  name: string
  type: OrganizationType
  registrationNumber?: string
  website?: string
  description?: string
}) {
  return apiFetch<OrganizationResponse>('/organizations', { method: 'POST', body: input })
}

export function getOrganization(organizationId: string) {
  return apiFetch<OrganizationResponse>(`/organizations/${organizationId}`, { method: 'GET' })
}

export function updateOrganization(
  organizationId: string,
  input: { name: string; registrationNumber?: string; website?: string; description?: string },
) {
  return apiFetch<OrganizationResponse>(`/organizations/${organizationId}`, { method: 'PATCH', body: input })
}

export function submitOrganizationForVerification(organizationId: string) {
  return apiFetch<OrganizationResponse>(`/organizations/${organizationId}/verification/submit`, { method: 'POST' })
}

export function getMyMemberships() {
  return apiFetch<MyOrganizationMembershipResponse[]>('/organization-memberships/me', { method: 'GET' })
}

export function listMembers(organizationId: string) {
  return apiFetch<OrganizationMemberResponse[]>(`/organizations/${organizationId}/members`, { method: 'GET' })
}

/** Creates a brand-new staff account — the email does not need to belong to an existing user. */
export function createMember(
  organizationId: string,
  input: { email: string; password: string; confirmPassword: string; role: OrganizationRole },
) {
  return apiFetch<OrganizationMemberResponse>(`/organizations/${organizationId}/members`, { method: 'POST', body: input })
}

export function changeMemberRole(organizationId: string, membershipId: string, input: { role: OrganizationRole }) {
  return apiFetch<OrganizationMemberResponse>(`/organizations/${organizationId}/members/${membershipId}/role`, { method: 'POST', body: input })
}

export function suspendMember(organizationId: string, membershipId: string) {
  return apiFetch<MessageResponse>(`/organizations/${organizationId}/members/${membershipId}/suspend`, { method: 'POST' })
}

export function reactivateMember(organizationId: string, membershipId: string) {
  return apiFetch<MessageResponse>(`/organizations/${organizationId}/members/${membershipId}/reactivate`, { method: 'POST' })
}

/** Server-generates a fresh temporary password, returned exactly once. */
export function resetMemberPassword(organizationId: string, membershipId: string) {
  return apiFetch<TemporaryCredentialResponse>(`/organizations/${organizationId}/members/${membershipId}/reset-password`, { method: 'POST' })
}

export function revokeMember(organizationId: string, membershipId: string) {
  return apiFetch<MessageResponse>(`/organizations/${organizationId}/members/${membershipId}/revoke`, { method: 'POST' })
}

// ---------------------------------------------------------------- verification evidence

/**
 * Uploads or replaces the organization's business/registration license. PDF only; private, random
 * storage key, never given a URL (CLAUDE.md sections 47-48). Bypasses {@code apiFetch} because a
 * multipart body must let the browser set its own boundary.
 */
export async function uploadOrganizationEvidence(organizationId: string, file: File): Promise<OrganizationEvidenceResponse> {
  const body = new FormData()
  body.append('file', file)

  const accessToken = getAccessToken()
  const response = await fetch(`${env.apiBaseUrl}/organizations/${organizationId}/verification/evidence`, {
    method: 'POST',
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    if (errorBody) throw new ApiError(errorBody)
    throw new Error(`Upload failed with status ${response.status}`)
  }
  return (await response.json()) as OrganizationEvidenceResponse
}

// ---------------------------------------------------------------- public logo

interface OrganizationLogoResponse {
  present: boolean
}

/** Uploads or replaces the organization's public logo. `ORGANIZATION_ADMIN` only. */
export async function uploadOrganizationLogo(organizationId: string, file: File): Promise<OrganizationLogoResponse> {
  const body = new FormData()
  body.append('file', file)

  const accessToken = getAccessToken()
  const response = await fetch(`${env.apiBaseUrl}/organizations/${organizationId}/logo`, {
    method: 'POST',
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    if (errorBody) throw new ApiError(errorBody)
    throw new Error(`Upload failed with status ${response.status}`)
  }
  return (await response.json()) as OrganizationLogoResponse
}

/** Public, unauthenticated, cacheable — safe to use directly as an `<img src>`. */
export function organizationLogoUrl(organizationId: string): string {
  return `${env.apiBaseUrl}/public/organizations/${organizationId}/logo/document`
}

// ---------------------------------------------------------------- public profile

export function getPublicOrganization(organizationId: string) {
  return apiFetch<PublicOrganizationResponse>(`/public/organizations/${organizationId}`, { method: 'GET' })
}
