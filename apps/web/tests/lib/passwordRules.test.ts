import { describe, expect, it } from 'vitest'
import { PASSWORD_RULES, passwordSchema } from '../../src/lib/validation/common'

/**
 * The live checklist (PASSWORD_RULES) and the submit-time schema (passwordSchema, which mirrors the
 * server's PasswordPolicy.REGEX) must agree: every rule ticked ⇔ the password is accepted.
 * Otherwise the form could show all green and still reject, or the reverse.
 */
const allRulesMet = (value: string) => Object.values(PASSWORD_RULES).every((rule) => rule(value))

describe('password rules', () => {
  it.each([
    ['', false],
    ['abcdefg1', true],
    ['abcdef1', false],
    ['abcdefgh', false],
    ['12345678', false],
    ['ABCDEFG9', true],
    ['pass word 1', true],
    // Non-ASCII letters do not satisfy the letter rule — the server regex is [A-Za-z].
    ['ñúñúñú12', false],
    ['a1' + 'x'.repeat(98), true],
    ['a1' + 'x'.repeat(99), false],
  ])('%j → accepted: %s', (value, accepted) => {
    expect(passwordSchema.safeParse(value).success).toBe(accepted)
    expect(allRulesMet(value)).toBe(accepted)
  })

  it('reports each rule independently', () => {
    expect(PASSWORD_RULES.length('abcdefgh')).toBe(true)
    expect(PASSWORD_RULES.letter('12345678')).toBe(false)
    expect(PASSWORD_RULES.number('abcdefgh')).toBe(false)
  })
})
