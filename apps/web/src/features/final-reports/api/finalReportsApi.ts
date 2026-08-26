import { env } from '../../../app/config/env'
import { ApiError, apiFetch } from '../../../lib/api/client'
import { getAccessToken } from '../../../lib/auth/tokenStore'
import type { FinalReportResponse } from '../types'

/** 204 while no report exists yet, which the client models as null rather than an error. */
export function getFinalReport(placementId: string) {
  return apiFetch<FinalReportResponse | undefined>(`/placements/${placementId}/final-report`, {
    method: 'GET',
  }).then((report) => report ?? null)
}

/**
 * Uploads the PDF as multipart.
 *
 * <p>This bypasses {@link apiFetch} only because that helper always sets a JSON content type, and a
 * multipart body must let the browser set its own boundary. Everything else is identical: the same
 * in-memory access token, the same credentials mode, and the same {@link ApiError} contract on
 * failure — the token is never read from storage (CLAUDE.md section 15).
 */
export async function uploadFinalReportDocument(placementId: string, file: File) {
  const body = new FormData()
  body.append('file', file)

  const accessToken = getAccessToken()
  const response = await fetch(`${env.apiBaseUrl}/placements/${placementId}/final-report/document`, {
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
  return (await response.json()) as FinalReportResponse
}

/**
 * Fetches the private document as a blob so the browser can save it.
 *
 * <p>Deliberately NOT an anchor pointing at object storage: the bytes are streamed through the API,
 * which re-authorizes the caller and audits the access every time (CLAUDE.md section 47).
 */
export async function downloadFinalReportDocument(placementId: string) {
  const accessToken = getAccessToken()
  const response = await fetch(`${env.apiBaseUrl}/placements/${placementId}/final-report/document`, {
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

export function submitFinalReport(placementId: string) {
  return apiFetch<FinalReportResponse>(`/placements/${placementId}/final-report/submit`, { method: 'POST' })
}

export function requestFinalReportRevision(placementId: string, comment: string) {
  return apiFetch<FinalReportResponse>(`/placements/${placementId}/final-report/request-revision`, {
    method: 'POST',
    body: { comment },
  })
}

export function approveFinalReport(placementId: string, comment?: string) {
  return apiFetch<FinalReportResponse>(`/placements/${placementId}/final-report/approve`, {
    method: 'POST',
    body: { comment: comment ?? null },
  })
}
