import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

/**
 * Shared support for the authenticated suites.
 *
 * <p><strong>No credential is ever written here.</strong> The QA identities are provisioned into an
 * isolated database through FursadHub's own registration, tenant-creation and managed-staff
 * endpoints; the resulting manifest — which does contain secrets — lives outside the repository and
 * is located by `FH_QA_MANIFEST`. Nothing in this file, and nothing this file writes, belongs in
 * version control. A suite run without that variable skips rather than falling back to anything.
 */
export interface QaAccount {
  label: string
  email: string
  password: string
  role: string
  scope: string
  /** Managed staff authenticate by username: LoginService refuses email once a username exists. */
  loginId: string
  loginKind: 'email' | 'username'
}

export interface QaEntity {
  kind: 'University' | 'Organization' | 'Department'
  key?: string
  university?: string
  id: string
  name: string
}

export interface QaManifest {
  accounts: QaAccount[]
  entities: QaEntity[]
}

export const QA_BASE = process.env.FH_QA_BASE_URL ?? 'http://localhost:5174'

export function manifestPath(): string | undefined {
  return process.env.FH_QA_MANIFEST
}

let cached: QaManifest | undefined
export function qaManifest(): QaManifest {
  if (cached) return cached
  const path = manifestPath()
  if (!path) throw new Error('FH_QA_MANIFEST is not set — the authenticated suites need a provisioned QA environment')
  cached = JSON.parse(readFileSync(path, 'utf8')) as QaManifest
  return cached
}

export function account(role: string, scope?: string): QaAccount {
  const found = qaManifest().accounts.find(
    (a) => a.role === role && (scope === undefined || a.scope.includes(scope) || a.label.includes(scope)),
  )
  if (!found) throw new Error(`no QA account for role=${role} scope=${scope ?? '*'}`)
  return found
}

export function entity(kind: QaEntity['kind'], nameFragment: string): QaEntity {
  const found = qaManifest().entities.find((e) => e.kind === kind && e.name.includes(nameFragment))
  if (!found) throw new Error(`no QA ${kind} matching "${nameFragment}"`)
  return found
}

/**
 * Signs in through the real login form — not by seeding a token — so every suite exercises the
 * same authentication path a person uses, refresh cookie included.
 */
export async function signIn(page: Page, who: QaAccount): Promise<void> {
  await page.goto(`${QA_BASE}/login`, { waitUntil: 'networkidle' })
  // `#identifier`, deliberately type="text": managed staff sign in with a username, so the field
  // cannot be type="email". Same form and same endpoint for every role.
  await page.locator('#identifier').fill(who.loginId)
  await page.locator('input[type="password"]').first().fill(who.password)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 }),
    page.getByRole('button', { name: /sign in|log ?in|continue/i }).first().click(),
  ])
  await page.waitForTimeout(600)
}

export async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.goto(`${QA_BASE}/login`, { waitUntil: 'domcontentloaded' })
}

/** Scrolls the page so IntersectionObserver reveals fire, then returns to the top. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.9
    // Capped: a long admin table is thousands of pixels tall, and every reveal on these pages sits
    // in the first few screens. Walking the whole height turned the sweep into a timeout.
    const limit = Math.min(document.body.scrollHeight, window.innerHeight * 12)
    for (let y = 0; y < limit; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 200))
  })
  await page.waitForTimeout(250)
}

export interface SurfaceReport {
  url: string
  landed: string
  overflow: number
  brokenImages: string[]
  consoleErrors: string[]
  /** Text of whatever the page settled on, trimmed — enough to tell a board from a denial. */
  heading: string | null
}

/** Visits one route and reports what actually happened, without asserting. */
export async function inspect(page: Page, route: string): Promise<SurfaceReport> {
  const consoleErrors: string[] = []
  const onConsole = (m: { type: () => string; text: () => string }) => {
    if (m.type() !== 'error') return
    const text = m.text()
    // A 401 on the silent refresh probe is the expected signed-out path, not a defect.
    if (/Failed to load resource|401|403|404/.test(text)) return
    consoleErrors.push(text)
  }
  const onPageError = (e: Error) => consoleErrors.push(`PAGEERROR ${e.message}`)
  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  await page.goto(QA_BASE + route, { waitUntil: 'networkidle' }).catch(() => {})
  await settle(page)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  const brokenImages = await page.evaluate(() =>
    [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
  )
  const heading = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() ?? null)

  page.off('console', onConsole)
  page.off('pageerror', onPageError)
  return { url: route, landed: new URL(page.url()).pathname, overflow, brokenImages, consoleErrors, heading }
}
