import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Resolved from the Vitest root (apps/web) rather than from import.meta.url — under the jsdom
// environment the module URL is not a file: URL, so fileURLToPath refuses it.
const TOKENS = readFileSync(resolve(process.cwd(), 'src/lib/design-system/tokens.css'), 'utf8')

/** The declarations inside one selector block, as a name → value map. */
function block(selector: string): Record<string, string> {
  const start = TOKENS.indexOf(selector)
  if (start === -1) throw new Error(`selector not found: ${selector}`)
  const open = TOKENS.indexOf('{', start)
  const close = TOKENS.indexOf('\n}', open)
  const body = TOKENS.slice(open + 1, close)
  const out: Record<string, string> = {}
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
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

/** CIE L* — perceptual lightness, which is what decides whether two surfaces look different. */
function lightness(hex: string): number {
  const y = luminance(hex)
  return y <= 216 / 24389 ? (y * 24389) / 27 : Math.cbrt(y) * 116 - 16
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const dark = block(":root[data-theme='dark']")

describe('dark theme ground ramp', () => {
  /*
   * The defect this guards against is the one the redesign fixed: a ramp whose top collapsed. The
   * previous values stepped 6.2 → 10.5 → 14.8 → 17.1 → 19.0, so an elevated panel was 2.3 lighter
   * than an inset one and a hover state 1.9 lighter again — below the point where a surface reads
   * as a separate plane, which is why every card, dialog and hovered row looked identical.
   *
   * Deliberately asserts the SEPARATION, not the hex values. Retuning the palette is fine; letting
   * the planes collapse into each other again is not.
   */
  const ramp = [
    ['sidebar', '--color-sidebar-background'],
    ['page', '--color-background'],
    ['card', '--color-surface'],
    ['inset', '--color-surface-muted'],
    ['elevated', '--color-surface-raised'],
    ['control', '--color-control-hover'],
  ] as const

  it('rises monotonically from the rail through to an interactive control', () => {
    const steps = ramp.map(([name, token]) => ({ name, L: lightness(dark[token]) }))
    for (let i = 1; i < steps.length; i += 1) {
      expect(
        steps[i].L,
        `${steps[i].name} must sit above ${steps[i - 1].name}`,
      ).toBeGreaterThan(steps[i - 1].L)
    }
  })

  it('keeps every step between the card and a control perceptible', () => {
    // From the card upward, each plane must be clearly distinguishable from the one below it.
    const above = ramp.slice(2).map(([, token]) => lightness(dark[token]))
    for (let i = 1; i < above.length; i += 1) {
      expect(above[i] - above[i - 1]).toBeGreaterThanOrEqual(3.5)
    }
  })

  it('is not black, and is not a flat wash', () => {
    expect(lightness(dark['--color-background'])).toBeGreaterThan(3)
    // Rail to control is the full range the shell has to work with.
    const range = lightness(dark['--color-control-hover']) - lightness(dark['--color-sidebar-background'])
    expect(range).toBeGreaterThan(15)
  })
})

describe('dark theme legibility', () => {
  const surfaces = ['--color-background', '--color-surface', '--color-surface-muted', '--color-surface-raised']

  it.each(['--color-text-primary', '--color-text-secondary', '--color-text-muted'])(
    '%s clears 4.5:1 on every ground tone',
    (token) => {
      for (const surface of surfaces) {
        expect(contrast(dark[token], dark[surface])).toBeGreaterThanOrEqual(4.5)
      }
    },
  )

  it('keeps the muted step legible on the topmost interactive surface too', () => {
    expect(contrast(dark['--color-text-muted'], dark['--color-control-hover'])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['--color-text-link', '--color-brand-accent-ink'])(
    '%s clears 4.5:1 on a card',
    (token) => {
      expect(contrast(dark[token], dark['--color-surface'])).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('holds the interactive border at the 3:1 WCAG 1.4.11 floor', () => {
    // `border-strong` is the visible boundary of inputs and outline buttons, so it is a UI
    // component boundary rather than decoration. The previous value sat at roughly 2:1.
    expect(contrast(dark['--color-border-strong'], dark['--color-surface'])).toBeGreaterThanOrEqual(3)
    expect(contrast(dark['--color-border-strong'], dark['--color-background'])).toBeGreaterThanOrEqual(3)
  })

  it.each([
    ['--color-success', '--color-success-bg'],
    ['--color-warning', '--color-warning-bg'],
    ['--color-danger', '--color-danger-bg'],
    ['--color-info', '--color-info-bg'],
  ])('%s is legible on %s', (fg, bg) => {
    expect(contrast(dark[fg], dark[bg])).toBeGreaterThanOrEqual(4.5)
  })
})

describe('brand anchors', () => {
  const light = block(':root {')

  it('leaves the canonical brand values untouched by the dark theme', () => {
    expect(light['--color-brand-navy']).toBe('#0b2a5b')
    expect(light['--color-brand-accent']).toBe('#f97316')
    // The dark block derives supporting neutrals only — it must never restate a brand anchor.
    expect(dark['--color-brand-navy']).toBeUndefined()
    expect(dark['--color-brand-accent']).toBeUndefined()
  })
})

describe('motion tokens', () => {
  it('collapses every duration under prefers-reduced-motion', () => {
    const reduced = TOKENS.slice(TOKENS.indexOf('prefers-reduced-motion'))
    const declared = [...TOKENS.matchAll(/(--duration-[\w-]+)\s*:/g)].map(([, name]) => name)
    const unique = [...new Set(declared)]
    expect(unique.length).toBeGreaterThanOrEqual(5)
    for (const token of unique) {
      expect(reduced, `${token} must be collapsed under reduced motion`).toContain(`${token}: 1ms`)
    }
  })
})
