import { env } from '../../../app/config/env'
import { ApiError, apiFetch } from '../../../lib/api/client'
import { downloadPrivateDocument } from '../../../lib/api/privateDocument'
import { getAccessToken } from '../../../lib/auth/tokenStore'

/**
 * The student's own private documents: their CV and their verification evidence
 * (CLAUDE.md sections 31, 47-48).
 *
 * <p>Every route here is rooted at {@code /students/me} — the owning record is resolved from the
 * authenticated caller, never from an id in the request. There is deliberately no
 * {@code /students/{id}/cv} anywhere in the API, because such a route invites authorizing by role
 * instead of by relationship.
 *
 * <p>Downloads fetch the BYTES through the authorized, audited API and hand the browser a
 * short-lived blob. Nothing here ever produces a URL that could be copied or shared.
 */

interface DocumentPresence {
  present: boolean
}

// ---------------------------------------------------------------- CV

export function getMyCv() {
  return apiFetch<DocumentPresence>('/students/me/cv')
}

export function uploadMyCv(file: File) {
  return uploadDocument('/students/me/cv', file)
}

export function removeMyCv() {
  return apiFetch<{ message: string }>('/students/me/cv', { method: 'DELETE' })
}

export function downloadMyCv() {
  return downloadPrivateDocument('/students/me/cv/document')
}

// ---------------------------------------------------------------- verification evidence

export function uploadMyEvidence(file: File) {
  return uploadDocument('/students/me/verification/evidence', file)
}

export function downloadMyEvidence() {
  return downloadPrivateDocument('/students/me/verification/evidence/document')
}

// ---------------------------------------------------------------- transport

/**
 * Multipart upload.
 *
 * <p>Bypasses {@code apiFetch} only because that helper always sets a JSON content type, and a
 * multipart body must let the browser set its own boundary. Everything else is identical: the same
 * in-memory access token — never read from storage (CLAUDE.md section 15) — the same credentials
 * mode, and the same {@link ApiError} contract on failure.
 */
async function uploadDocument<T = DocumentPresence>(path: string, file: File): Promise<T> {
  const body = new FormData()
  body.append('file', file)

  const accessToken = getAccessToken()
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    if (errorBody) {
      throw new ApiError(errorBody)
    }
    throw new Error(`Upload failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export interface ApplicationCvUpload { id: string; filename: string; contentType: string }
export function uploadApplicationCv(opportunityId: string, file: File) {
  return uploadDocument<ApplicationCvUpload>(`/opportunities/${opportunityId}/application-cv`, file)
}
export function removeApplicationCv(opportunityId: string, id: string) {
  return apiFetch<void>(`/opportunities/${opportunityId}/application-cv/${id}`, { method: 'DELETE' })
}
export function downloadApplicationCv(opportunityId: string, id: string) {
  return downloadPrivateDocument(`/opportunities/${opportunityId}/application-cv/${id}/document`)
}

