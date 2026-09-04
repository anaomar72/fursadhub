import { env } from '../../app/config/env'
import { ApiError } from './client'
import { getAccessToken } from '../auth/tokenStore'

/**
 * Fetches a private document as a blob through the API.
 *
 * <p>Deliberately not an `<a href>` pointing at object storage. Every private file in FursadHub is
 * streamed through an endpoint that re-authorizes the caller and records the read
 * (CLAUDE.md sections 47 and 51) — a permanent public URL would bypass both. Storage keys are
 * random and never leave the backend.
 *
 * <p>Uses `fetch` rather than {@link apiFetch} because the response body is binary, not JSON. An
 * error response IS json, so a failure still surfaces as the standard {@link ApiError} with its
 * stable `code`, and callers keep branching on the code rather than on English text.
 */
export async function downloadPrivateDocument(path: string): Promise<Blob> {
  const accessToken = getAccessToken()
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    if (errorBody) throw new ApiError(errorBody)
    throw new Error(`Download failed with status ${response.status}`)
  }
  return response.blob()
}

/**
 * Hands a fetched blob to the browser as a download.
 *
 * <p>The object URL is revoked immediately after the click so it does not linger as an
 * unauthenticated handle to a private document.
 */
export function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}
