import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { RoleShell } from './RoleShell'

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-primary text-on-brand' : 'text-foreground-secondary hover:bg-surface-muted',
  )

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
      <div className="border-b border-border bg-surface">
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          <NavLink to="/account/notifications" className={navLinkClasses}>
            {t('notifications:title')}
          </NavLink>
          <NavLink to="/account/privacy" className={navLinkClasses}>
            {t('privacy:nav.privacy')}
          </NavLink>
        </nav>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Outlet />
      </div>
    </RoleShell>
  )
}
