import { env } from '../../app/config/env'
import { getAccessToken, setAccessToken } from '../auth/tokenStore'
import { refreshAccessToken } from '../auth/refreshCoordinator'

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
 * Centralized API client. Attaches `Authorization: Bearer <token>` whenever an in-memory access
 * token is present (see lib/auth/tokenStore.ts) and always sends credentials so the HttpOnly
 * refresh cookie is included on same-site auth calls.
 *
 * On a 401 from any endpoint other than /auth/**, this makes one attempt to silently refresh the
 * access token (deduplicated via lib/auth/refreshCoordinator.ts) and retries the original request
 * once. If refresh also fails, the in-memory access token is cleared and the original error
 * propagates so callers/UI can redirect to login.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return execute<T>(path, options, false)
}

async function execute<T>(path: string, options: RequestOptions, isRetry: boolean): Promise<T> {
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

    const canRetryWithRefresh = response.status === 401 && !isRetry && !path.startsWith('/auth/')
    if (canRetryWithRefresh) {
      const refreshedToken = await refreshAccessToken()
      if (refreshedToken) {
        return execute<T>(path, options, true)
      }
      setAccessToken(null)
    }

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
