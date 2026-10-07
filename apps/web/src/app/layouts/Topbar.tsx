import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Avatar, Icon, IconButton, LanguageToggle, Menu, ThemeToggle } from '../../components/ui'
import { NotificationBell } from '../../features/notifications/components/NotificationBell'
import * as authApi from '../../features/auth/api/authApi'
import { useAvatarSrc } from '../../lib/api/useAvatarSrc'

export interface TopbarProps {
  /** Translated area name, e.g. "University" — the portal context shown beside the menu button. */
  areaLabel: string
  /**
   * Whether the primary navigation drawer is currently open, and the id of the element it is.
   *
   * <p>The trigger carried a label but no state: a screen-reader user was told "Open navigation"
   * whether the drawer was open or shut, with nothing tying the button to the thing it controls.
   * `aria-expanded` and `aria-controls` state both.
   */
  navigationOpen?: boolean
  navigationId?: string
  onOpenNavigation: () => void
  onSignOut: () => void
}

/**
 * The authenticated topbar: GLOBAL controls only — the portal you are in, then language, theme,
 * notifications and your own account block.
 *
 * <p><strong>It does not name the page.</strong> It used to print the active destination's label in
 * large display type, directly above a {@link PageHeader} printing the page title again — two
 * headings for one page, the first truncated to "Acco…" on a phone. The page names itself, once, in
 * its `<h1>`; the topbar keeps the quiet portal context, which is what orients a person who arrived
 * from a link or whose sidebar is collapsed into the mobile drawer.
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
export function Topbar({ areaLabel, navigationOpen = false, navigationId, onOpenNavigation, onSignOut }: TopbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const meQuery = useQuery({ queryKey: ['me'], queryFn: authApi.getMe, staleTime: 60_000 })
  const avatarSrc = useAvatarSrc(meQuery.data?.id, meQuery.data?.hasAvatar ?? false)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6 lg:px-8">
      <IconButton
        label={t('common:shell.openNavigation')}
        aria-expanded={navigationOpen}
        aria-controls={navigationId}
        onClick={onOpenNavigation}
        className="lg:hidden"
      >
        <Icon name="menu" className="size-5" />
      </IconButton>

      <p className="min-w-0 truncate text-label text-foreground-secondary">{areaLabel}</p>

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
            // avatar survives, so the control never crowds out the portal context.
            <span className="flex items-center gap-2.5 rounded-full border border-border py-1 pe-2 ps-1 sm:pe-3">
              <Avatar name={meQuery.data?.email ?? '?'} src={avatarSrc} size="sm" />
              <span className="hidden min-w-0 text-start sm:block">
                <span className="block max-w-[10rem] truncate text-xs font-semibold text-foreground">
                  {meQuery.data?.email ?? '—'}
                </span>
                <span className="block truncate text-caption text-foreground-secondary">{areaLabel}</span>
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
