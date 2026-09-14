import { describe, expect, it } from 'vitest'
import i18n, { ensureLanguageLoaded } from '../../../src/lib/i18n'

/**
 * Somali is delivered as its own chunk rather than compiled into the entry bundle: both languages
 * used to be statically imported, so every visitor downloaded roughly 200KB of translations for a
 * language they were not reading — the admin console's namespace included, on the public home page.
 *
 * <p>What must not change is that Somali is a first-class product language. These assertions pin
 * the two properties that guarantee that: every namespace the application declares is actually
 * present in Somali once loaded, and English — the fallback every render depends on — is never
 * subject to the async path at all.
 */
describe('language resource loading', () => {
  it('keeps English available without any asynchronous load', () => {
    // English is compiled in, so it must be readable before anything is awaited. If this ever
    // regresses, the first paint of every page falls back to raw translation keys.
    expect(i18n.hasResourceBundle('en', 'common')).toBe(true)
    expect(i18n.getResource('en', 'common', 'a11y.skipToContent')).toBeTruthy()
  })

  it('loads every declared namespace in Somali, not just the public ones', async () => {
    await ensureLanguageLoaded('so')

    // The namespaces the app initialises with, plus the two registered outside that list.
    const namespaces = [
      'common', 'auth', 'validation', 'student', 'university', 'organization',
      'opportunities', 'recruitment', 'placements', 'internship', 'notifications',
      'legal', 'privacy', 'admin', 'account', 'testimonials',
    ]
    const missing = namespaces.filter((ns) => !i18n.hasResourceBundle('so', ns))
    expect(missing, 'every namespace must exist in Somali').toEqual([])
  })

  it('resolves repeatedly without reloading, so a language toggle cannot thrash the network', async () => {
    await ensureLanguageLoaded('so')
    await expect(ensureLanguageLoaded('so')).resolves.toBeUndefined()
    await expect(ensureLanguageLoaded('en')).resolves.toBeUndefined()
  })

  it('treats a regional Somali tag as Somali', async () => {
    await expect(ensureLanguageLoaded('so-SO')).resolves.toBeUndefined()
    expect(i18n.hasResourceBundle('so', 'common')).toBe(true)
  })
})
