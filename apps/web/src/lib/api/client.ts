import { env } from '../../app/config/env'
import { getAccessToken } from '../auth/tokenStore'

/** Stable API error contract from CLAUDE.md section 11 — branch on `code`, never on `message`. */
export interface ApiErrorBody {
  code: string
  message: string
  status: number
  path: string
  timestamp: string
  fieldErrors: { field: string; code: string; message: string | null }[]
}

export class ApiError extends Error {
  readonly body: ApiErrorBody

  constructor(body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.body = body
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

/**
 * Centralized API client foundation.
 *
 * Attaches `Authorization: Bearer <token>` whenever an in-memory access token
 * is present (see lib/auth/tokenStore.ts) and always sends credentials so the
 * future HttpOnly refresh cookie is included. No real login/refresh flow is
 * wired yet — that is Phase 1 (CLAUDE.md section 14).
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const accessToken = getAccessToken()

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null
    if (errorBody) {
      throw new ApiError(errorBody)
    }
    throw new Error(`Request to ${path} failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
