import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import commonEn from '../../locales/en/common.json'
import commonSo from '../../locales/so/common.json'
import authEn from '../../locales/en/auth.json'
import authSo from '../../locales/so/auth.json'
import validationEn from '../../locales/en/validation.json'
import validationSo from '../../locales/so/validation.json'
import studentEn from '../../locales/en/student.json'
import studentSo from '../../locales/so/student.json'
import universityEn from '../../locales/en/university.json'
import universitySo from '../../locales/so/university.json'

export const defaultNamespace = 'common'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: commonEn, auth: authEn, validation: validationEn, student: studentEn, university: universityEn },
      so: { common: commonSo, auth: authSo, validation: validationSo, student: studentSo, university: universitySo },
    },
    ns: ['common', 'auth', 'validation', 'student', 'university'],
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
