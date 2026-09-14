import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import commonEn from '../../locales/en/common.json'
import authEn from '../../locales/en/auth.json'
import validationEn from '../../locales/en/validation.json'
import studentEn from '../../locales/en/student.json'
import universityEn from '../../locales/en/university.json'
import organizationEn from '../../locales/en/organization.json'
import opportunitiesEn from '../../locales/en/opportunities.json'
import recruitmentEn from '../../locales/en/recruitment.json'
import placementsEn from '../../locales/en/placements.json'
import internshipEn from '../../locales/en/internship.json'
import notificationsEn from '../../locales/en/notifications.json'
import legalEn from '../../locales/en/legal.json'
import privacyEn from '../../locales/en/privacy.json'
import adminEn from '../../locales/en/admin.json'
import accountEn from '../../locales/en/account.json'
import testimonialsEn from '../../locales/en/testimonials.json'

export const defaultNamespace = 'common'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        auth: authEn,
        validation: validationEn,
        student: studentEn,
        university: universityEn,
        organization: organizationEn,
        opportunities: opportunitiesEn,
        recruitment: recruitmentEn,
        placements: placementsEn,
        internship: internshipEn,
        notifications: notificationsEn,
        legal: legalEn,
        privacy: privacyEn,
        admin: adminEn,
        account: accountEn,
        testimonials: testimonialsEn,
      },
    },
    ns: [
      'common',
      'auth',
      'validation',
      'student',
      'university',
      'organization',
      'opportunities',
      'recruitment',
      'placements',
      'internship',
      // Phase 7
      'notifications',
      'legal',
      'privacy',
      'admin',
      // Phase 8
      'account',
    ],
    fallbackLng: 'en',
    supportedLngs: ['en', 'so'],
    defaultNS: defaultNamespace,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n

/**
 * Ensures the active language's resources are present before anything renders with them.
 *
 * <p>English is compiled in; Somali arrives as its own chunk (see `./somali`). This resolves
 * immediately for English, fetches once for Somali, and is safe to call repeatedly — i18next keeps
 * the bundle after the first `addResourceBundle`, and a second call short-circuits on the guard.
 *
 * <p>A failed fetch is deliberately swallowed rather than thrown. If the Somali chunk cannot be
 * reached, `fallbackLng: 'en'` means the product renders in English — degraded, but usable. Taking
 * the whole application down because one translation file 404'd would be the worse outcome.
 */
const loaded = new Set<string>(['en'])

export async function ensureLanguageLoaded(language: string | undefined): Promise<void> {
  const lng = language?.startsWith('so') ? 'so' : 'en'
  if (loaded.has(lng)) return
  loaded.add(lng)
  try {
    const { somaliResources } = await import('./somali')
    const resources = await somaliResources()
    for (const [namespace, bundle] of Object.entries(resources)) {
      i18n.addResourceBundle(lng, namespace, bundle, true, true)
    }
    // The language was already switched to `so` before its bundle landed, so the trees that
    // rendered against the English fallback need to be told to re-read.
    await i18n.changeLanguage(i18n.language)
  } catch {
    loaded.delete(lng)
  }
}

// Covers every later switch made through <LanguageToggle />, without that component having to know
// that one of the two languages is code-split.
i18n.on('languageChanged', (language) => {
  void ensureLanguageLoaded(language)
})
