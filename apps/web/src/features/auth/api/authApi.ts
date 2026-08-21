import { apiFetch } from '../../../lib/api/client'
import type { LoginResponse, MeResponse, MessageResponse, RegisterResponse } from '../types'

/**
 * Thin wrappers around the Phase 1 auth endpoints (CLAUDE.md section 19). Every call goes
 * through the centralized apiFetch client, which already attaches the in-memory access token
 * and sends credentials so refresh/logout's HttpOnly cookie flows automatically.
 */

export function register(input: { email: string; password: string; preferredLocale?: string }) {
  return apiFetch<RegisterResponse>('/auth/register', { method: 'POST', body: input })
}

export function verifyEmail(input: { email: string; code: string }) {
  return apiFetch<MessageResponse>('/auth/email/verify', { method: 'POST', body: input })
}

export function resendVerification(email: string) {
  return apiFetch<MessageResponse>('/auth/email/resend', { method: 'POST', body: { email } })
}

export function login(input: { email: string; password: string }) {
  return apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: input })
}

export function refresh() {
  return apiFetch<LoginResponse>('/auth/refresh', { method: 'POST' })
}

export function logout() {
  return apiFetch<MessageResponse>('/auth/logout', { method: 'POST' })
}

export function logoutAll() {
  return apiFetch<MessageResponse>('/auth/logout-all', { method: 'POST' })
}

export function forgotPassword(email: string) {
  return apiFetch<MessageResponse>('/auth/password/forgot', { method: 'POST', body: { email } })
}

export function resetPassword(input: { token: string; newPassword: string }) {
  return apiFetch<MessageResponse>('/auth/password/reset', { method: 'POST', body: input })
}

export function getMe() {
  return apiFetch<MeResponse>('/me', { method: 'GET' })
}
