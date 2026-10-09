import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { BrandLogo, ButtonLink, Icon, IconButton, LanguageToggle, ThemeToggle } from '../../components/ui'
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
 * The public header: the FursadHub lockup, the destination set centred in the bar, and the account
 * controls on the right. The active destination is marked by an orange underline (brand orange is a
 * non-text mark here, which is what it is for).
 *
 * <p>It shares the public content column with every page below it (`PublicContainer` widths and
 * gutters), so the logo lines up with the page's first line of text at every width.
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
              'relative rounded-md px-3 py-2 text-body font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
              isActive ? 'text-foreground' : 'text-foreground-secondary hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              {t(`common:nav.${link.key}`)}
              {/* The approved active marker: a short orange rule under the current destination. */}
              {isActive && (
                <span aria-hidden="true" className="absolute inset-x-3 -bottom-3 hidden h-0.5 rounded-full bg-brand-accent xl:block" />
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
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
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
            className="ms-auto flex h-full w-[min(22rem,90vw)] flex-col overflow-y-auto border-s border-border bg-surface p-4 shadow-lg motion-safe:animate-panel-in-right"
          >
            <IconButton label={t('common:nav.closeMenu')} onClick={() => setOpen(false)} className="mb-4 self-end">
              <Icon name="close" className="size-5" />
            </IconButton>
            <nav className="flex flex-col gap-1 [&>a]:py-3" aria-label={t('common:nav.publicNavigation')}>
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
      <ButtonLink to="/login" onClick={onNavigate} variant="outline" size="sm" className={cn(mobile && 'h-11 w-full')}>
        {t('common:nav.login')}
      </ButtonLink>
      <ButtonLink to="/register" onClick={onNavigate} size="sm" className={cn(mobile && 'h-11 w-full')}>
        {t('common:nav.getStarted')}
      </ButtonLink>
    </>
  )
}
