import { apiFetch } from '../../../lib/api/client'
import type { LegalDocument, LegalDocumentType, LegalStatus } from '../types'

/** Public and unauthenticated — someone deciding whether to register must be able to read first. */
export function getPublicLegalDocument(documentType: LegalDocumentType, locale: string) {
  return apiFetch<LegalDocument>(`/public/legal-documents/${documentType}?locale=${encodeURIComponent(locale)}`)
}

export function listPublicLegalDocuments(locale: string) {
  return apiFetch<LegalDocument[]>(`/public/legal-documents?locale=${encodeURIComponent(locale)}`)
}

export function getLegalStatus(locale: string) {
  return apiFetch<LegalStatus>(`/me/legal-status?locale=${encodeURIComponent(locale)}`)
}

export function acceptLegalDocument(legalDocumentId: string) {
  return apiFetch<{ message: string }>('/me/terms-acceptances', {
    method: 'POST',
    body: { legalDocumentId },
  })
}
