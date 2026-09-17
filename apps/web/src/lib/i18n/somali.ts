/**
 * The Somali resource bundle, loaded on demand.
 *
 * <p>Kept out of {@link ../i18n index.ts} so it becomes its own chunk. Both languages used to be
 * statically imported into the entry graph, which meant every visitor downloaded roughly 200KB of
 * translations for a language they were not reading — including the admin console's namespace, on
 * the public home page. English stays static because it is `fallbackLng` and every render needs it;
 * Somali is fetched when it is actually the active language.
 *
 * <p>Nothing here changes what the product can say. Both languages remain first-class, fully
 * translated and switchable — only the moment of delivery moved.
 */
export async function somaliResources() {
  const [
    common, auth, validation, student, university, organization, opportunities,
    recruitment, placements, internship, notifications, legal, privacy, admin,
    account, testimonials,
  ] = await Promise.all([
    import('../../locales/so/common.json'),
    import('../../locales/so/auth.json'),
    import('../../locales/so/validation.json'),
    import('../../locales/so/student.json'),
    import('../../locales/so/university.json'),
    import('../../locales/so/organization.json'),
    import('../../locales/so/opportunities.json'),
    import('../../locales/so/recruitment.json'),
    import('../../locales/so/placements.json'),
    import('../../locales/so/internship.json'),
    import('../../locales/so/notifications.json'),
    import('../../locales/so/legal.json'),
    import('../../locales/so/privacy.json'),
    import('../../locales/so/admin.json'),
    import('../../locales/so/account.json'),
    import('../../locales/so/testimonials.json'),
  ])
  return {
    common: common.default, auth: auth.default, validation: validation.default,
    student: student.default, university: university.default, organization: organization.default,
    opportunities: opportunities.default, recruitment: recruitment.default,
    placements: placements.default, internship: internship.default,
    notifications: notifications.default, legal: legal.default, privacy: privacy.default,
    admin: admin.default, account: account.default, testimonials: testimonials.default,
  }
}
