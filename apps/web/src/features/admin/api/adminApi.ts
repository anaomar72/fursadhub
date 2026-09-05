import { apiFetch } from '../../../lib/api/client'
import { downloadPrivateDocument } from '../../../lib/api/privateDocument'
import type { LegalDocument, LegalDocumentType } from '../../legal/types'
import type { PrivacyRequest, PrivacyRequestState } from '../../privacy/types'
import type {
  AdminOpportunity,
  AdminOpportunityDetail,
  AdminOrganization,
  AdminSession,
  AdminUniversity,
  AdminUser,
  AuditEvent,
  EscalatedCase,
  InstitutionVerificationStatus,
  OpportunityMode,
  OpportunityStatus,
  Page,
  PlatformAdminGrant,
  PlatformRole,
  PlatformStatistics,
  PlatformTemporaryCredential,
  UserStatus,
  VerificationOfficer,
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

/**
 * One account. Backed by {@code GET /admin/users/{userId}} — it has always existed on
 * {@code AdminController}; the web app simply never called it.
 */
export function getUser(userId: string) {
  return apiFetch<AdminUser>(`/admin/users/${userId}`)
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

// ---------------------------------------------------------------- opportunity oversight

/**
 * Platform-wide opportunity oversight (Backend Phase B6). Super Admin only, and READ ONLY — there is
 * deliberately no create, update, publish, pause or delete counterpart anywhere in this file.
 * Organizations own their opportunities; the platform observes them.
 */
export function listAdminOpportunities(
  options: {
    query?: string
    status?: OpportunityStatus
    mode?: OpportunityMode
    organizationId?: string
    page?: number
  } = {},
) {
  const params = new URLSearchParams()
  if (options.query) params.set('query', options.query)
  if (options.status) params.set('status', options.status)
  if (options.mode) params.set('mode', options.mode)
  if (options.organizationId) params.set('organizationId', options.organizationId)
  if (options.page !== undefined) params.set('page', String(options.page))
  const query = params.toString()
  return apiFetch<Page<AdminOpportunity>>(`/admin/opportunities${query ? `?${query}` : ''}`)
}

export function getAdminOpportunity(opportunityId: string) {
  return apiFetch<AdminOpportunityDetail>(`/admin/opportunities/${opportunityId}`)
}

// ---------------------------------------------------------------- verification officers

/**
 * Managed verification officers (Backend Phase B5.6).
 *
 * A different resource from platform roles above, and deliberately so: those endpoints GRANT a role
 * to an account that already exists, these CREATE the account. Both are needed and neither can do
 * the other's job.
 *
 * There is no `createSuperAdmin` counterpart anywhere in this file. Super admin is not
 * managed-provisionable — the API has no endpoint for it, and the request below has no role field
 * through which one could be asked for.
 */
export function listVerificationOfficers() {
  return apiFetch<VerificationOfficer[]>('/admin/verification-officers')
}

export function createVerificationOfficer(values: {
  displayName: string
  username: string
  email: string
  password: string
  confirmPassword: string
}) {
  return apiFetch<VerificationOfficer>('/admin/verification-officers', {
    method: 'POST',
    body: values,
  })
}

/**
 * Sets or replaces the officer's display name (Backend Phase B5.6).
 *
 * Replacement only — there is no clear operation, so this always sends a real name. A legacy officer
 * with `displayName: null` is set for the first time through the same call.
 */
export function changeVerificationOfficerDisplayName(userId: string, displayName: string) {
  return apiFetch<VerificationOfficer>(`/admin/verification-officers/${userId}/display-name`, {
    method: 'POST',
    body: { displayName },
  })
}

/** One-time and irreversible: after this the officer's email stops authenticating them. */
export function assignVerificationOfficerUsername(userId: string, username: string) {
  return apiFetch<VerificationOfficer>(`/admin/verification-officers/${userId}/username`, {
    method: 'POST',
    body: { username },
  })
}

export function resetVerificationOfficerPassword(userId: string) {
  return apiFetch<PlatformTemporaryCredential>(
    `/admin/verification-officers/${userId}/reset-password`,
    { method: 'POST' },
  )
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

/** One organization, with the same verification fields the queue row carries. */
export function getOrganization(organizationId: string) {
  return apiFetch<AdminOrganization>(`/admin/organizations/${organizationId}`)
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
  return downloadPrivateDocument(`/admin/organizations/${organizationId}/verification/evidence/document`)
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

/** One university, with the same verification fields the queue row carries. */
export function getUniversity(universityId: string) {
  return apiFetch<AdminUniversity>(`/admin/universities/${universityId}`)
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
  return downloadPrivateDocument(`/admin/universities/${universityId}/verification/evidence/document`)
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
  return downloadPrivateDocument(`/admin/verification-escalations/${caseId}/evidence/document`)
}

// ---------------------------------------------------------------- privacy requests

export function listPrivacyRequests(options: { state?: PrivacyRequestState; page?: number } = {}) {
  const params = new URLSearchParams()
  if (options.state) params.set('state', options.state)
  if (options.page !== undefined) params.set('page', String(options.page))
  const query = params.toString()
  return apiFetch<Page<PrivacyRequest>>(`/admin/privacy-requests${query ? `?${query}` : ''}`)
}

/*
 * There is deliberately no getPrivacyRequest() here. GET /admin/privacy-requests/{id} exists, but
 * the list endpoint already returns the complete PrivacyRequestResponse for every row, so the
 * review drawer reads the row it was opened from. A second fetch of identical data would be a
 * request for nothing.
 */

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

/**
 * The audit trail. `from`/`to` are ISO-8601 instants that {@code AdminComplianceController} has
 * always accepted; the platform-activity chart counts a month by asking for the smallest possible
 * page of it and reading `totalElements`, rather than downloading the events themselves.
 */
export function listAuditEvents(
  options: {
    eventType?: string
    userId?: string
    page?: number
    size?: number
    from?: string
    to?: string
  } = {},
) {
  const params = new URLSearchParams()
  if (options.eventType) params.set('eventType', options.eventType)
  if (options.userId) params.set('userId', options.userId)
  if (options.from) params.set('from', options.from)
  if (options.to) params.set('to', options.to)
  if (options.page !== undefined) params.set('page', String(options.page))
  if (options.size !== undefined) params.set('size', String(options.size))
  const query = params.toString()
  return apiFetch<Page<AuditEvent>>(`/admin/audit-events${query ? `?${query}` : ''}`)
}

export function listAuditEventTypes() {
  return apiFetch<string[]>('/admin/audit-events/types')
}
