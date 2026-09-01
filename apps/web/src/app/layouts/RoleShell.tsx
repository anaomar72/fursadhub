import type { ReactNode } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Avatar, BrandLogo, Menu } from '../../components/ui'
import { NotificationBell } from '../../features/notifications/components/NotificationBell'
import { useAvatarSrc } from '../../lib/api/useAvatarSrc'
import { useAuth } from '../../lib/auth/AuthContext'
import * as authApi from '../../features/auth/api/authApi'

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
 * (BRAND_AND_UI_GUIDELINES.md section 6).
 *
 * <p>The thin brand-orange rule under the header is this shell's one quiet signature — the same
 * "path from the open door" motif the landing page's hero spends boldly, carried at low volume
 * across every authenticated screen so the whole product reads as one place (frontend-design
 * guidance: spend boldness in one location, keep the rest disciplined).
 *
 * <p>Phase 7 put the notification bell here rather than in each area, so a student who is also
 * university staff sees the same unread count wherever they happen to be. Phase 8 added the
 * identity control next to it — a real Avatar (photo or initials), not bare "Account"/"Sign out"
 * text links, so a signed-in person recognizes themselves in the one piece of chrome present on
 * every page they'll ever see.
 */
export function RoleShell({ areaLabel, children }: RoleShellProps) {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const meQuery = useQuery({ queryKey: ['me'], queryFn: authApi.getMe, staleTime: 60_000 })
  const avatarSrc = useAvatarSrc(meQuery.data?.id, meQuery.data?.hasAvatar ?? false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="h-[3px] bg-brand-primary" aria-hidden="true" />
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo surface="light" className="h-8" />
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground-secondary">
              {areaLabel}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Menu
              triggerLabel={t('nav.account')}
              trigger={<Avatar name={meQuery.data?.email ?? '?'} src={avatarSrc} size="sm" />}
              items={[
                { label: t('nav.account'), onSelect: () => navigate('/account') },
                { label: t('auth:session.signOut'), onSelect: handleSignOut, danger: true },
              ]}
            />
          </div>
        </div>
      </header>

      <main className="flex-1">{children ?? <Outlet />}</main>
    </div>
  )
}
