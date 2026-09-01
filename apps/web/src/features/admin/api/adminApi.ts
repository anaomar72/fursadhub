import { env } from '../../../app/config/env'
import { ApiError, apiFetch } from '../../../lib/api/client'
import { getAccessToken } from '../../../lib/auth/tokenStore'
import type { LegalDocument, LegalDocumentType } from '../../legal/types'
import type { PrivacyRequest, PrivacyRequestState } from '../../privacy/types'
import type {
  AdminOrganization,
  AdminSession,
  AdminUniversity,
  AdminUser,
  AuditEvent,
  EscalatedCase,
  InstitutionVerificationStatus,
  Page,
  PlatformAdminGrant,
  PlatformRole,
  PlatformStatistics,
  UserStatus,
} from '../types'

// ---------------------------------------------------------------- session

/** Answers 200 with an empty role list for an ordinary user, so it is safe to call unconditionally. */
export function getAdminSession() {
  return apiFetch<AdminSession>('/admin/me')
}

// ---------------------------------------------------------------- statistics

export function getStatistics() {
  return apiFetch<PlatformStatistics>('/admin/statistics')
}

// ---------------------------------------------------------------- accounts

export function searchUsers(options: { query?: string; status?: UserStatus; page?: number } = {}) {
  const params = new URLSearchParams()
  if (options.query) params.set('query', options.query)
  if (options.status) params.set('status', options.status)
  if (options.page !== undefined) params.set('page', String(options.page))
  const query = params.toString()
  return apiFetch<Page<AdminUser>>(`/admin/users${query ? `?${query}` : ''}`)
}

export function suspendUser(userId: string, reason: string) {
  return apiFetch<{ message: string }>(`/admin/users/${userId}/suspend`, {
    method: 'POST',
    body: { reason },
  })
}

export function reactivateUser(userId: string) {
  return apiFetch<{ message: string }>(`/admin/users/${userId}/reactivate`, { method: 'POST' })
}

// ---------------------------------------------------------------- platform roles

export function listPlatformRoles() {
  return apiFetch<PlatformAdminGrant[]>('/admin/platform-roles')
}

export function grantPlatformRole(userId: string, role: PlatformRole) {
  return apiFetch<PlatformAdminGrant>('/admin/platform-roles', {
    method: 'POST',
    body: { userId, role },
  })
}

export function revokePlatformRole(grantId: string) {
  return apiFetch<{ message: string }>(`/admin/platform-roles/${grantId}/revoke`, { method: 'POST' })
}

// ---------------------------------------------------------------- organizations

export function listOrganizations(
  options: { status?: InstitutionVerificationStatus; query?: string; page?: number } = {},
) {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  if (options.query) params.set('query', options.query)
  if (options.page !== undefined) params.set('page', String(options.page))
  const query = params.toString()
  return apiFetch<Page<AdminOrganization>>(`/admin/organizations${query ? `?${query}` : ''}`)
}

/**
 * Every transition is its own command endpoint, never a status field the client sets
 * (CLAUDE.md section 10).
 */
export function organizationTransition(
  organizationId: string,
  action: 'begin-review' | 'verify' | 'request-changes' | 'reject' | 'suspend' | 'revoke',
  note?: string,
) {
  return apiFetch<AdminOrganization>(`/admin/organizations/${organizationId}/${action}`, {
    method: 'POST',
    body: note === undefined ? undefined : { note },
  })
}

/** Fetches the organization's license as a blob through the authorized, audited reviewer route. */
export function downloadOrganizationEvidence(organizationId: string) {
  return downloadBlob(`/admin/organizations/${organizationId}/verification/evidence/document`)
}

// ---------------------------------------------------------------- universities

export function listUniversities(
  options: { status?: InstitutionVerificationStatus; query?: string; page?: number } = {},
) {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  if (options.query) params.set('query', options.query)
  if (options.page !== undefined) params.set('page', String(options.page))
  const query = params.toString()
  return apiFetch<Page<AdminUniversity>>(`/admin/universities${query ? `?${query}` : ''}`)
}

export function universityTransition(
  universityId: string,
  action: 'begin-review' | 'verify' | 'request-changes' | 'reject' | 'suspend' | 'revoke',
  note?: string,
) {
  return apiFetch<AdminUniversity>(`/admin/universities/${universityId}/${action}`, {
    method: 'POST',
    body: note === undefined ? undefined : { note },
  })
}

/** Fetches the university's registration/accreditation document as a blob, same as above. */
export function downloadUniversityEvidence(universityId: string) {
  return downloadBlob(`/admin/universities/${universityId}/verification/evidence/document`)
}

// ---------------------------------------------------------------- verification escalations

export function listEscalations() {
  return apiFetch<EscalatedCase[]>('/admin/verification-escalations')
}

export function resolveEscalation(
  caseId: string,
  action: 'verify' | 'reject' | 'request-more-evidence',
  note?: string,
) {
  return apiFetch<{ message: string }>(`/admin/verification-escalations/${caseId}/${action}`, {
    method: 'POST',
    body: note === undefined ? undefined : { note },
  })
}

/** Fetches the student's private evidence as a blob. */
export function downloadEscalationEvidence(caseId: string) {
  return downloadBlob(`/admin/verification-escalations/${caseId}/evidence/document`)
}

/**
 * Shared transport for every admin evidence download.
 *
 * <p>Deliberately not an anchor pointing at object storage: the bytes stream through the API, which
 * re-authorizes the reviewer and audits the read every time (CLAUDE.md sections 31, 47).
 */
async function downloadBlob(path: string): Promise<Blob> {
  const accessToken = getAccessToken()
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    if (errorBody) {
      throw new ApiError(errorBody)
    }
    throw new Error(`Download failed with status ${response.status}`)
  }
  return response.blob()
}

// ---------------------------------------------------------------- privacy requests

export function listPrivacyRequests(options: { state?: PrivacyRequestState; page?: number } = {}) {
  const params = new URLSearchParams()
  if (options.state) params.set('state', options.state)
  if (options.page !== undefined) params.set('page', String(options.page))
  const query = params.toString()
  return apiFetch<Page<PrivacyRequest>>(`/admin/privacy-requests${query ? `?${query}` : ''}`)
}

export function resolvePrivacyRequest(
  requestId: string,
  action: 'begin-review' | 'complete' | 'reject',
  note?: string,
) {
  return apiFetch<PrivacyRequest>(`/admin/privacy-requests/${requestId}/${action}`, {
    method: 'POST',
    body: note === undefined ? undefined : { note },
  })
}

// ---------------------------------------------------------------- legal documents

export function listLegalDocuments() {
  return apiFetch<LegalDocument[]>('/admin/legal-documents')
}

/** Publishes a NEW version. There is deliberately no edit or delete counterpart. */
export function publishLegalDocument(input: {
  documentType: LegalDocumentType
  version: string
  locale: string
  title: string
  body: string
  effectiveFrom: string
}) {
  return apiFetch<LegalDocument>('/admin/legal-documents', { method: 'POST', body: input })
}

// ---------------------------------------------------------------- audit

export function listAuditEvents(
  options: { eventType?: string; userId?: string; page?: number } = {},
) {
  const params = new URLSearchParams()
  if (options.eventType) params.set('eventType', options.eventType)
  if (options.userId) params.set('userId', options.userId)
  if (options.page !== undefined) params.set('page', String(options.page))
  const query = params.toString()
  return apiFetch<Page<AuditEvent>>(`/admin/audit-events${query ? `?${query}` : ''}`)
}

export function listAuditEventTypes() {
  return apiFetch<string[]>('/admin/audit-events/types')
}
