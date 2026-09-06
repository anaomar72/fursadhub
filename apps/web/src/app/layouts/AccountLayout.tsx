import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppShell } from './AppShell'
import { PageContainer } from './PageContainer'

/**
 * The role-neutral account area: profile, notifications, privacy and consents.
 *
 * <p>Deliberately NOT a sixth role. Every signed-in person has these, whatever they are on
 * FursadHub, and duplicating them into the student, university, organization and admin areas would
 * mean four copies of the same page — and four places to forget a fix. It is still one React
 * application with layouts per area, exactly as CLAUDE.md section 9 requires.
 */
export function AccountLayout() {
  const { t } = useTranslation()

  return (
    <AppShell
      areaLabel={t('common:nav.account')}
      sections={[
        {
          items: [
            { to: '/account/profile', label: t('account:nav.profile'), icon: 'user' },
            { to: '/account/notifications', label: t('notifications:title'), icon: 'bell' },
            { to: '/account/privacy', label: t('privacy:nav.privacy'), icon: 'lock' },
          ],
        },
      ]}
    >
      <PageContainer width="narrow">
        <Outlet />
      </PageContainer>
    </AppShell>
  )
}
