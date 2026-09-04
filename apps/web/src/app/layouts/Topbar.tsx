import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Icon, IconButton, LanguageToggle, Menu, ThemeToggle } from '../../components/ui'
import { NotificationBell } from '../../features/notifications/components/NotificationBell'
import * as authApi from '../../features/auth/api/authApi'
import { useAvatarSrc } from '../../lib/api/useAvatarSrc'
import { findActiveNavItem, type NavSection } from './navigation'

export interface TopbarProps {
  /** Translated area name, e.g. "University" — the second line of the page context. */
  areaLabel: string
  sections: NavSection[]
  onOpenNavigation: () => void
  onSignOut: () => void
}

/**
 * The authenticated topbar: page context on the left, then the controls every signed-in person
 * needs wherever they are — language, theme, notifications and their own account menu.
 *
 * <p>The page title is derived from the sidebar item matching the current route rather than passed
 * down by each page, so it can never disagree with the highlighted destination.
 *
 * <p>The approved reference also shows a global search field. There is no search endpoint behind it
 * in the current API for any authenticated area, so it is deliberately omitted rather than mocked
 * up as a control that does nothing (CLAUDE.md section 75: do not invent functionality).
 */
export function Topbar({ areaLabel, sections, onOpenNavigation, onSignOut }: TopbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const meQuery = useQuery({ queryKey: ['me'], queryFn: authApi.getMe, staleTime: 60_000 })
  const avatarSrc = useAvatarSrc(meQuery.data?.id, meQuery.data?.hasAvatar ?? false)

  const activeItem = findActiveNavItem(sections, location)

  return (
    <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <IconButton
        label={t('common:shell.openNavigation')}
        onClick={onOpenNavigation}
        className="lg:hidden"
      >
        <Icon name="menu" className="size-5" />
      </IconButton>

      <div className="min-w-0">
        <p className="truncate font-display text-base font-bold text-foreground sm:text-lg">
          {activeItem?.label ?? areaLabel}
        </p>
        <p className="truncate text-xs text-foreground-secondary">{areaLabel}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Always present: unlike PublicHeader, the mobile drawer here carries destinations only,
            so hiding this on small screens would leave a phone with no way to switch language. */}
        <LanguageToggle />
        <ThemeToggle />
        <NotificationBell />
        <Menu
          triggerLabel={t('common:nav.account')}
          trigger={<Avatar name={meQuery.data?.email ?? '?'} src={avatarSrc} size="sm" />}
          items={[
            { label: t('account:nav.profile'), onSelect: () => navigate('/account/profile') },
            { label: t('privacy:nav.privacy'), onSelect: () => navigate('/account/privacy') },
            { label: t('auth:session.signOut'), onSelect: onSignOut, danger: true },
          ]}
        />
      </div>
    </header>
  )
}
