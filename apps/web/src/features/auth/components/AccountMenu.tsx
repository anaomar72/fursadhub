import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar, Icon, Menu } from '../../../components/ui'
import { useAvatarSrc } from '../../../lib/api/useAvatarSrc'
import { useAuth } from '../../../lib/auth/AuthContext'
import { useAccountContext } from '../useAccountContext'

/**
 * The signed-in identity control on the PUBLIC site.
 *
 * <p>It replaces a large navy "My portal" call to action. That button was wrong in two ways at
 * once: it shouted at a person who is already a customer, in the slot every mature platform
 * reserves for quiet identity — and it said nothing about who they were signed in as, so the public
 * site read as a separate product from the workspace behind it. This says
 * "Recruiter · Acme Ltd" and opens a menu, which is the pattern people already know.
 *
 * <p><strong>Context is truthful and derived.</strong> The role and institution come from current
 * membership data through {@link useAccountContext}, never from a query string or local state. While
 * that resolves, the trigger shows the name alone rather than guessing a role — a wrong label is
 * worse than a late one.
 *
 * <p><strong>What it never shows:</strong> the full email address, membership ids, tenant ids or
 * department ids. This control sits on a public page where someone else can be looking at the
 * screen, and none of those identifiers help the person using it.
 *
 * <p>Destinations are existing routes only. Nothing here invents a page, and no tenant switcher is
 * offered because the product does not support switching.
 */
export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut, isAuthenticated } = useAuth()
  const account = useAccountContext(isAuthenticated)
  const avatarSrc = useAvatarSrc(account?.userId, account?.hasAvatar ?? false)

  if (!account) return null

  const context = account.roleLabel
    ? [account.roleLabel, account.tenantName].filter(Boolean).join(' · ')
    : undefined

  const go = (path: string) => () => {
    onNavigate?.()
    navigate(path)
  }

  return (
    <Menu
      align="end"
      triggerLabel={t('common:nav.account')}
      trigger={
        <span className="flex items-center gap-2.5 rounded-full border border-border bg-surface py-1 pe-2 ps-1 transition-colors duration-150 hover:border-border-strong motion-reduce:transition-none sm:pe-3">
          <Avatar name={account.displayName} src={avatarSrc} size="sm" />
          <span className="hidden min-w-0 text-start sm:block">
            <span className="block max-w-[11rem] truncate text-xs font-semibold text-foreground">
              {account.displayName}
            </span>
            {context && (
              <span className="block max-w-[11rem] truncate text-[11px] text-foreground-secondary">{context}</span>
            )}
          </span>
          <Icon name="chevronDown" className="hidden size-4 shrink-0 text-foreground-secondary sm:block" />
        </span>
      }
      items={[
        { label: t('common:nav.workspace'), onSelect: go(account.consolePath) },
        { label: t('common:nav.accountSettings'), onSelect: go('/account/profile') },
        {
          label: t('common:nav.signOut'),
          danger: true,
          onSelect: () => {
            void signOut().then(() => navigate('/'))
          },
        },
      ]}
    />
  )
}
