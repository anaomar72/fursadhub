import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cn } from '../../src/lib/utils/cn'

// Resolved from the Vitest root (apps/web), as in darkTheme.test.ts.
const TOKENS = readFileSync(resolve(process.cwd(), 'src/lib/design-system/tokens.css'), 'utf8')
const INDEX_CSS = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

function rootBlock(): Record<string, string> {
  const open = TOKENS.indexOf('{', TOKENS.indexOf(':root {'))
  const close = TOKENS.indexOf('\n}', open)
  const out: Record<string, string> = {}
  for (const [, name, value] of TOKENS.slice(open + 1, close).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[name] = value.trim()
  }
  return out
}

const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const root = rootBlock()
const WHITE = '#ffffff'
/** Dark-theme card, from the measured ramp — the surface an action button sits on at night. */
const DARK_CARD = '#141f30'

describe('action colour (WCAG 2.2 AA)', () => {
  it('keeps the approved brand orange, and documents why it is not a text fill', () => {
    expect(root['--color-brand-accent']).toBe('#f97316')
    expect(contrast(root['--color-brand-accent'], WHITE)).toBeLessThan(4.5)
  })

  it.each([
    ['--color-action-primary'],
    ['--color-action-primary-hover'],
    ['--color-action-danger'],
    ['--color-action-danger-hover'],
  ])('%s carries white label text at 4.5:1 or better', (token) => {
    expect(root['--color-on-action']).toBe(WHITE)
    expect(contrast(root[token], WHITE)).toBeGreaterThanOrEqual(4.5)
  })

  it('measures #C2410C at 5.18:1 with white', () => {
    expect(root['--color-action-primary']).toBe('#c2410c')
    expect(contrast('#c2410c', WHITE)).toBeCloseTo(5.18, 2)
  })

  it('keeps the action fill distinguishable from the dark-theme card (3:1 non-text boundary)', () => {
    expect(contrast(root['--color-action-primary'], DARK_CARD)).toBeGreaterThanOrEqual(3)
  })

  it('does not redefine the action fills in dark mode, so the measured ratios hold in both themes', () => {
    const dark = TOKENS.slice(TOKENS.indexOf(":root[data-theme='dark'] {"))
    const darkBody = dark.slice(0, dark.indexOf('\n}'))
    expect(darkBody).not.toMatch(/--color-action-/)
  })
})

describe('shape and elevation scale', () => {
  const rem = (v: string) => parseFloat(v) * 16

  it('caps every ordinary radius at 16px', () => {
    for (const step of ['sm', 'md', 'lg', 'xl', '2xl']) {
      expect(rem(root[`--radius-${step}`])).toBeLessThanOrEqual(16)
    }
    expect(rem(root['--radius-sm'])).toBe(6)
    expect(rem(root['--radius-md'])).toBe(10)
    expect(rem(root['--radius-lg'])).toBe(12)
  })

  it('gives the student workspace the softest allowed corner, not a 20px pill', () => {
    const student = INDEX_CSS.slice(INDEX_CSS.indexOf("[data-workspace='student'] {"))
    expect(student.slice(0, student.indexOf('}'))).toMatch(/--workspace-radius:\s*var\(--radius-xl\)/)
  })
})

describe('typography roles', () => {
  it('defines every role in the scale', () => {
    for (const role of ['display-xl', 'display-lg', 'title-page', 'title-section', 'title-panel', 'body-lg', 'body', 'label', 'caption', 'metric']) {
      expect(INDEX_CSS).toMatch(new RegExp(`--text-${role}:`))
    }
  })

  it('never sets a reading size below 12px', () => {
    expect(INDEX_CSS).toMatch(/--text-caption:\s*0\.75rem/)
  })

  it('survives class merging next to a text colour (tailwind-merge knows the roles)', () => {
    // Without the cn() configuration, tailwind-merge reads `text-title-page` as a colour and drops it.
    expect(cn('text-title-page', 'text-foreground')).toBe('text-title-page text-foreground')
    expect(cn('text-body text-muted', 'text-foreground')).toBe('text-body text-foreground')
    // …and still resolves a genuine size conflict.
    expect(cn('text-sm', 'text-body')).toBe('text-body')
  })
})
