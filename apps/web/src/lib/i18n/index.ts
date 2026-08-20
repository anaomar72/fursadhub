import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import commonEn from '../../locales/en/common.json'
import commonSo from '../../locales/so/common.json'

export const defaultNamespace = 'common'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: commonEn },
      so: { common: commonSo },
    },
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
