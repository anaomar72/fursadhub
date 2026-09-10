import { z } from 'zod'

/**
 * The managed-account login identifier (Backend Phase B5.5).
 *
 * Mirrors the backend `UsernamePolicy` so an invalid username is caught before submit — the server
 * remains the authority (CLAUDE.md section 6/11). Lowercase letters, digits, dots, underscores and
 * hyphens; must start and end alphanumeric; no repeated punctuation; 3-64 characters; no `@`, which
 * is what keeps the single login field able to tell a username from an email.
 */
export const USERNAME_PATTERN = /^[a-z0-9]+([._-][a-z0-9]+)*$/

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'validation:username.length')
  .max(64, 'validation:username.length')
  .regex(USERNAME_PATTERN, 'validation:username.format')
