import type { ReactNode } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLogo } from '../../components/ui'
import { NotificationBell } from '../../features/notifications/components/NotificationBell'
import { useAuth } from '../../lib/auth/AuthContext'

interface RoleShellProps {
  /** Role-area label shown next to the brand mark, e.g. "Student". Translated by the caller. */
  areaLabel: string
  /**
   * Optional body. When omitted the shell renders the route {@code <Outlet />} itself, which is what
   * every role area does; the account area passes its own sub-navigation plus an Outlet instead.
   */
  children?: ReactNode
}

/**
 * Shared topbar/content shell for the role-scoped areas (Student, University,
 * Organization, Admin) and the account area. Navigation content differs per area and is supplied
 * by each area's own routes/features — this only establishes the consistent
 * chrome so every area clearly belongs to one FursadHub product
 * (BRAND_AND_UI_GUIDELINES.md section 6). Not exported outside app/layouts.
 *
 * <p>Phase 7 put the notification bell here rather than in each area, so a student who is also
 * university staff sees the same unread count wherever they happen to be.
 */
export function RoleShell({ areaLabel, children }: RoleShellProps) {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo surface="light" className="h-8" />
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground-secondary">
              {areaLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Link
              to="/account/privacy"
              className="rounded-md px-2 py-1.5 text-sm font-medium text-foreground-secondary hover:text-foreground"
            >
              {t('nav.account')}
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md px-2 py-1.5 text-sm font-medium text-foreground-secondary hover:text-foreground"
            >
              {t('auth:session.signOut')}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children ?? <Outlet />}</main>
    </div>
  )
}
