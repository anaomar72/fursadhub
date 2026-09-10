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
 * The approved authenticated topbar (design-reference/presentation-refresh-2026, references
 * 07-10): page context on the left, then the controls every signed-in person needs wherever they
 * are — language, theme, notifications and their own account block.
 *
 * <p>The page title is derived from the sidebar item matching the current route rather than passed
 * down by each page, so it can never disagree with the highlighted destination.
 *
 * <p>Two elements the references show are deliberately NOT built:
 * <ul>
 *   <li>the global search field — there is no search endpoint behind it in the current API for any
 *       authenticated area, so it is omitted rather than mocked up as a control that does nothing;</li>
 *   <li>a person's display name beside the avatar — `/me` returns an email and status, not a name,
 *       so the identity block shows the real email rather than inventing one.</li>
 * </ul>
 * Both follow the reference README: never fabricate data, and never change the backend just to
 * match a mockup (CLAUDE.md section 75).
 */
export function Topbar({ areaLabel, sections, onOpenNavigation, onSignOut }: TopbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const meQuery = useQuery({ queryKey: ['me'], queryFn: authApi.getMe, staleTime: 60_000 })
  const avatarSrc = useAvatarSrc(meQuery.data?.id, meQuery.data?.hasAvatar ?? false)

  const activeItem = findActiveNavItem(sections, location)

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <IconButton label={t('common:shell.openNavigation')} onClick={onOpenNavigation} className="lg:hidden">
        <Icon name="menu" className="size-5" />
      </IconButton>

      <div className="min-w-0">
        <p className="truncate font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground sm:text-xl">
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
          trigger={
            // The reference pairs the avatar with an identity block. On narrow viewports only the
            // avatar survives, so the control never crowds out the page title.
            <span className="flex items-center gap-2.5 rounded-full border border-border py-1 pe-2 ps-1 sm:pe-3">
              <Avatar name={meQuery.data?.email ?? '?'} src={avatarSrc} size="sm" />
              <span className="hidden min-w-0 text-start sm:block">
                <span className="block max-w-[10rem] truncate text-xs font-semibold text-foreground">
                  {meQuery.data?.email ?? '—'}
                </span>
                <span className="block truncate text-[11px] text-foreground-secondary">{areaLabel}</span>
              </span>
              <Icon name="chevronDown" className="hidden size-4 shrink-0 text-foreground-secondary sm:block" />
            </span>
          }
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
