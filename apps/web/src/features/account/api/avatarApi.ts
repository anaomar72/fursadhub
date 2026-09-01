import { env } from '../../../app/config/env'
import { ApiError } from '../../../lib/api/client'
import { getAccessToken } from '../../../lib/auth/tokenStore'

interface AvatarPresence {
  present: boolean
}

/** Uploads or replaces the caller's own profile picture. Self-service only (CLAUDE.md section 12). */
export async function uploadMyAvatar(file: File): Promise<AvatarPresence> {
  const body = new FormData()
  body.append('file', file)

  const accessToken = getAccessToken()
  const response = await fetch(`${env.apiBaseUrl}/me/avatar`, {
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
  return (await response.json()) as AvatarPresence
}

/**
 * Any authenticated user's avatar as a blob — including the caller's own. Unlike every other
 * private document in FursadHub, there is no ownership check on this read: a profile picture is
 * identity presented to others, not evidence kept private (CLAUDE.md section 47's "private
 * documents" rule does not apply to this one classification).
 */
export async function downloadAvatar(userId: string): Promise<Blob> {
  const accessToken = getAccessToken()
  const response = await fetch(`${env.apiBaseUrl}/users/${userId}/avatar/document`, {
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
