import { RouteSuspense } from '../router/RouteFallback'
import { Link, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLogo, LanguageToggle, ThemeToggle } from '../../components/ui'
import { AuthBrandPanel, AuthFooterLinks, BackToHomeLink } from '../../features/auth/components/AuthShell'

/**
 * The FursadHub authentication shell — sign in, register, email verification and password reset.
 *
 * <p><strong>Desktop (`lg`+):</strong> a split. The approved photograph and the route's own brand
 * copy hold the left column; the form column holds the right. The split earns its place here: the
 * panel says, per route, why this step exists (see `authPanels.ts`), which is content, not decoration.
 *
 * <p><strong>Phones and tablets:</strong> one column — the FursadHub logo, the controls, then the
 * form. No decorative panel above the form: on a first visit from a phone the form IS the page, and
 * a photo strip only pushed the first field below the fold.
 *
 * <p>The form column is `max-w-md` (28rem), the same measure the public site uses for a focused
 * form, rather than a hand-picked pixel width. Chrome-free by design — no public header or footer —
 * so nothing competes with the single task on screen. Language, theme, the way home and the legal
 * links are always reachable.
 */
export function AuthLayout() {
  const { t } = useTranslation()
  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-2 lg:bg-surface">
      <AuthBrandPanel />

      {/*
        Below `lg` there is no grid, so the column carries its own `min-h-svh` to fill the screen and
        keep the footer links at the bottom rather than floating under the submit button. At `lg` the
        grid item already stretches to the row, so it drops back to `min-h-0`.
      */}
      <div className="flex min-h-svh flex-col px-4 py-5 sm:px-8 sm:py-6 lg:min-h-0 lg:px-12 xl:px-16">
        <header className="flex items-center justify-between gap-4">
          {/* Phones and tablets: the brand, linking home. Desktop: the brand is in the panel, so the
              slot carries the explicit way back instead. */}
          <Link
            to="/"
            aria-label={t('common:app.name')}
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:hidden"
          >
            <BrandLogo size="sm" />
          </Link>
          <div className="hidden lg:block">
            <BackToHomeLink />
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 flex-col py-8 sm:justify-center sm:py-12">
          <div className="mx-auto w-full max-w-md">
            <RouteSuspense>
              <Outlet />
            </RouteSuspense>
          </div>
        </main>

        <footer className="mx-auto w-full max-w-md border-t border-border pt-5">
          <AuthFooterLinks />
        </footer>
      </div>
    </div>
  )
}
