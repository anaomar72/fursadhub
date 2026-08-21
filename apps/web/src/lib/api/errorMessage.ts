import type { TFunction } from 'i18next'
import { ApiError } from './client'

/**
 * Generic version of features/auth/api/errorMessage.ts's pattern, parametrized by i18n namespace
 * so Phase 2+ features can reuse it instead of re-implementing the same code->copy lookup
 * (CLAUDE.md section 11 — always branch on the stable `code`, never the raw `message`).
 */
export function apiErrorMessage(t: TFunction, namespace: string, page: string, error: unknown): string {
  if (error instanceof ApiError) {
    const key = `${namespace}:${page}.errors.${error.body.code}`
    const translated = t(key)
    if (translated !== key) {
      return translated
    }
  }
  return t(`${namespace}:${page}.errors.generic`)
}
