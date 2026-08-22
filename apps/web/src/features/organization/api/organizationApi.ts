import { apiFetch } from '../../../lib/api/client'
import type {
  MyOrganizationMembershipResponse,
  OrganizationMemberResponse,
  OrganizationResponse,
  OrganizationRole,
  OrganizationType,
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

export function assignMember(organizationId: string, input: { email: string; role: OrganizationRole }) {
  return apiFetch<OrganizationMemberResponse>(`/organizations/${organizationId}/members`, { method: 'POST', body: input })
}

export function revokeMember(organizationId: string, membershipId: string) {
  return apiFetch<MessageResponse>(`/organizations/${organizationId}/members/${membershipId}/revoke`, { method: 'POST' })
}
