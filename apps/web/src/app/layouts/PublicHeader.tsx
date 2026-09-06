import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { BrandLogo, Icon, IconButton, LanguageToggle, ThemeToggle } from '../../components/ui'
import { cn } from '../../lib/utils/cn'

const links = [
  { to: '/', key: 'home', end: true },
  { to: '/opportunities', key: 'internships', end: false },
  { to: '/organizations', key: 'organizations', end: true },
  { to: '/universities', key: 'universities', end: true },
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
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLElement>('a,button')?.focus()
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
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
                <span aria-hidden="true" className="absolute inset-x-3 -bottom-[13px] hidden h-[3px] rounded-full bg-brand-accent lg:block" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex h-[60px] max-w-[1400px] items-center gap-5 px-4 sm:px-6 lg:px-14">
        <Link
          to="/"
          aria-label={t('common:app.name')}
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <BrandLogo />
        </Link>

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center lg:flex"
          aria-label={t('common:nav.publicNavigation')}
        >
          {navigation}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <LanguageToggle />
          <ThemeToggle />
          <LoginLinks t={t} />
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
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
        <div
          className="fixed inset-0 top-[60px] z-40 bg-overlay lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div
            id="public-mobile-menu"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('common:nav.publicNavigation')}
            className="ml-auto flex h-full w-[min(22rem,90vw)] flex-col border-l border-border bg-surface p-4 shadow-lg motion-safe:animate-menu-in"
          >
            <nav className="flex flex-col" aria-label={t('common:nav.publicNavigation')}>
              {navigation}
            </nav>
            <div className="mt-auto grid gap-3 border-t border-border pt-5">
              <div className="sm:hidden">
                <LanguageToggle />
              </div>
              <LoginLinks t={t} mobile />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function LoginLinks({ t, mobile = false }: { t: TFunction; mobile?: boolean }) {
  return (
    <>
      <Link
        to="/login"
        className={cn(
          'inline-flex h-9 items-center rounded-lg border border-border-strong px-4 text-sm font-semibold text-foreground transition-colors hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
          mobile && 'justify-center',
        )}
      >
        {t('common:nav.login')}
      </Link>
      <Link
        to="/register"
        className={cn(
          'inline-flex h-9 items-center rounded-lg bg-brand-accent px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
          mobile && 'justify-center',
        )}
      >
        {t('common:nav.getStarted')}
      </Link>
    </>
  )
}
