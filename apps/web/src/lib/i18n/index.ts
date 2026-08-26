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
import organizationEn from '../../locales/en/organization.json'
import organizationSo from '../../locales/so/organization.json'
import opportunitiesEn from '../../locales/en/opportunities.json'
import opportunitiesSo from '../../locales/so/opportunities.json'
import recruitmentEn from '../../locales/en/recruitment.json'
import recruitmentSo from '../../locales/so/recruitment.json'
import placementsEn from '../../locales/en/placements.json'
import placementsSo from '../../locales/so/placements.json'
import internshipEn from '../../locales/en/internship.json'
import internshipSo from '../../locales/so/internship.json'
import notificationsEn from '../../locales/en/notifications.json'
import notificationsSo from '../../locales/so/notifications.json'
import legalEn from '../../locales/en/legal.json'
import legalSo from '../../locales/so/legal.json'
import privacyEn from '../../locales/en/privacy.json'
import privacySo from '../../locales/so/privacy.json'
import adminEn from '../../locales/en/admin.json'
import adminSo from '../../locales/so/admin.json'

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
      },
      so: {
        common: commonSo,
        auth: authSo,
        validation: validationSo,
        student: studentSo,
        university: universitySo,
        organization: organizationSo,
        opportunities: opportunitiesSo,
        recruitment: recruitmentSo,
        placements: placementsSo,
        internship: internshipSo,
        notifications: notificationsSo,
        legal: legalSo,
        privacy: privacySo,
        admin: adminSo,
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
