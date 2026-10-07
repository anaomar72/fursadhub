import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { BrandLogo, Icon, IconButton, LanguageToggle, ThemeToggle } from '../../components/ui'
import { NotificationBell } from '../../features/notifications/components/NotificationBell'
import { cn } from '../../lib/utils/cn'
import { useAuth } from '../../lib/auth/AuthContext'
import { AccountMenu } from '../../features/auth/components/AccountMenu'

const links = [
  { to: '/', key: 'home', end: true },
  { to: '/opportunities', key: 'internships', end: false },
  { to: '/organizations', key: 'organizations', end: false },
  { to: '/universities', key: 'universities', end: false },
  { to: '/about', key: 'about', end: true },
] as const

/**
 * The approved public header (design-reference/presentation-refresh-2026, references 01-06):
 * the FursadHub lockup on the left, the destination set CENTRED in the bar, and the account
 * controls on the right. The active destination is marked by an orange underline.
 */
export function PublicHeader() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Passive, and it only ever flips a boolean — the listener never reads layout or writes style,
    // so scrolling stays on the compositor.
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    menuRef.current?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    menuRef.current?.querySelector<HTMLElement>('a,button')?.focus()
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const controls = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"]') ?? []).filter(el => el.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('keydown', escape)
      document.body.style.overflow = previousOverflow
      trigger?.focus()
    }
  }, [open])

  const navigation: ReactNode = (
    <>
      {links.map((link) => (
        <NavLink
          key={link.key}
          to={link.to}
          end={link.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'relative rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none lg:px-3.5',
              isActive ? 'text-brand-navy dark:text-foreground' : 'text-foreground-secondary hover:text-brand-navy dark:hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              {t(`common:nav.${link.key}`)}
              {/* The approved active marker: a short orange rule under the current destination. */}
              {isActive && (
                <span aria-hidden="true" className="absolute inset-x-3 -bottom-[8px] hidden h-[3px] rounded-full bg-brand-accent lg:block" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </>
  )

  return (
    /*
      Scrolled state: the bar earns a shadow once content is passing under it, and loses it at the
      top of the page. Height, padding and every control position are identical in both states —
      the only thing that changes is the edge, so navigation can never jump under the pointer.
    */
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-surface transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none',
        scrolled ? 'border-border-strong shadow-sm' : 'border-border',
      )}
    >
      <div className="mx-auto flex h-[60px] xl:h-[50px] max-w-[1448px] items-center gap-5 px-4 sm:px-6 lg:px-[42px]">
        <Link
          to="/"
          aria-label={t('common:app.name')}
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <BrandLogo />
        </Link>

        <nav
          className="mx-auto hidden items-center xl:flex"
          aria-label={t('common:nav.publicNavigation')}
        >
          {navigation}
        </nav>

        <div className="ml-auto hidden items-center gap-2 xl:flex">
          <LanguageToggle />
          <ThemeToggle />
          <LoginLinks t={t} />
        </div>

        <div className="ml-auto flex items-center gap-1 xl:hidden">
          <LanguageToggle className="hidden sm:inline-flex" />
          <ThemeToggle />
          <IconButton
            ref={triggerRef}
            label={open ? t('common:nav.closeMenu') : t('common:nav.openMenu')}
            aria-expanded={open}
            aria-controls="public-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? 'close' : 'menu'} className="size-5" />
          </IconButton>
        </div>
      </div>

      {open && (
        <dialog
          ref={menuRef}
          id="public-mobile-menu"
          aria-label={t('common:nav.publicNavigation')}
          aria-modal="true"
          onCancel={(event) => { event.preventDefault(); setOpen(false) }}
          className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-overlay p-0 text-foreground backdrop:bg-transparent"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div
            className="ml-auto flex h-full w-[min(22rem,90vw)] flex-col overflow-y-auto border-l border-border bg-surface p-4 shadow-lg motion-safe:animate-menu-in"
          >
            <IconButton label={t('common:nav.closeMenu')} onClick={() => setOpen(false)} className="mb-4 self-end">
              <Icon name="close" className="size-5" />
            </IconButton>
            <nav className="flex flex-col" aria-label={t('common:nav.publicNavigation')}>
              {navigation}
            </nav>
            <div className="mt-auto grid gap-3 border-t border-border pt-5">
              <div className="sm:hidden">
                <LanguageToggle />
              </div>
              <LoginLinks t={t} mobile onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </dialog>
      )}
    </header>
  )
}

function LoginLinks({ t, mobile = false, onNavigate }: { t: TFunction; mobile?: boolean; onNavigate?: () => void }) {
  const { isAuthenticated, isInitializing } = useAuth()
  if (isInitializing) return null
  /*
   * A signed-in visitor gets identity, not a call to action. The previous treatment was a large
   * navy "My portal" button: the loudest control in the bar, aimed at someone who is already a
   * customer, and silent about which account they were signed in as — which made the public site
   * read as a separate product from the workspace behind it.
   */
  if (isAuthenticated) {
    return (
      <>
        <NotificationBell />
        <AccountMenu onNavigate={onNavigate} />
      </>
    )
  }
  return (
    <>
      <Link
        to="/login"
        onClick={onNavigate}
        className={cn(
          'inline-flex h-9 items-center rounded-lg border border-border-strong px-4 text-sm font-semibold text-foreground transition-colors hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
          mobile && 'justify-center',
        )}
      >
        {t('common:nav.login')}
      </Link>
      <Link
        to="/register"
        onClick={onNavigate}
        className={cn(
          'inline-flex h-9 items-center rounded-lg bg-action-primary px-5 text-sm font-semibold text-on-action shadow-xs transition-colors hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
          mobile && 'justify-center',
        )}
      >
        {t('common:nav.getStarted')}
      </Link>
    </>
  )
}
