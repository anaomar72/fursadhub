import { apiFetch } from '../../../lib/api/client'
import type { ConsentRecord, ConsentType, PrivacyRequest, PrivacyRequestType } from '../types'

export function listMyPrivacyRequests() {
  return apiFetch<PrivacyRequest[]>('/me/privacy-requests')
}

/** The subject is never sent — the backend takes it from the authenticated caller. */
export function submitPrivacyRequest(requestType: PrivacyRequestType, details: string) {
  return apiFetch<PrivacyRequest>('/me/privacy-requests', {
    method: 'POST',
    body: { requestType, details },
  })
}

export function listMyConsents() {
  return apiFetch<ConsentRecord[]>('/me/consents')
}

export function setConsent(consentType: ConsentType, granted: boolean) {
  return apiFetch<ConsentRecord>(`/me/consents/${consentType}`, {
    method: 'PUT',
    body: { granted },
  })
}
