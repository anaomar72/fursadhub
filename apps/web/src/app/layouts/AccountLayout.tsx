import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RoleShell } from './RoleShell'
import { AreaTabs } from './AreaTabs'

/**
 * The role-neutral account area: notifications, privacy and consents.
 *
 * <p>Deliberately NOT a sixth role. Every signed-in person has these, whatever they are on
 * FursadHub, and duplicating them into the student, university, organization and admin areas would
 * mean four copies of the same page — and four places to forget a fix. It is still one React
 * application with layouts per area, exactly as CLAUDE.md section 9 requires.
 */
export function AccountLayout() {
  const { t } = useTranslation()

  return (
    <RoleShell areaLabel={t('nav.account')}>
      <AreaTabs
        items={[
          { to: '/account/profile', label: t('account:nav.profile') },
          { to: '/account/notifications', label: t('notifications:title') },
          { to: '/account/privacy', label: t('privacy:nav.privacy') },
        ]}
      />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Outlet />
      </div>
    </RoleShell>
  )
}
