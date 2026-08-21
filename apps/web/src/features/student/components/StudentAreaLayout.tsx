import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../lib/utils/cn'

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-primary text-on-brand' : 'text-foreground-secondary hover:bg-surface-muted',
  )

export function StudentAreaLayout() {
  const { t } = useTranslation()
  return (
    <>
      <div className="border-b border-border bg-surface">
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          <NavLink to="/student/enrollment" className={navLinkClasses}>
            {t('student:nav.enrollment')}
          </NavLink>
          <NavLink to="/student/profile" className={navLinkClasses}>
            {t('student:nav.profile')}
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </>
  )
}
