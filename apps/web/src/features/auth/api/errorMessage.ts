import type { TFunction } from 'i18next'
import { ApiError } from '../../../lib/api/client'

/**
 * Maps a stable API error code (CLAUDE.md section 11) to translated copy under
 * `auth:<page>.errors.<CODE>`, falling back to `auth:<page>.errors.generic`. Never branches on
 * the raw `message` string from the API.
 */
export function authErrorMessage(t: TFunction, page: string, error: unknown): string {
  if (error instanceof ApiError) {
    const key = `auth:${page}.errors.${error.body.code}`
    const translated = t(key)
    if (translated !== key) {
      return translated
    }
  }
  return t(`auth:${page}.errors.generic`)
}
