import { RouteSuspense } from '../router/RouteFallback'
import { Outlet } from 'react-router-dom'
import { LanguageToggle, ThemeToggle } from '../../components/ui'
import {
  AuthBrandPanel,
  AuthFooterLinks,
  BackToHomeLink,
} from '../../features/auth/components/AuthShell'

/**
 * The FursadHub authentication shell.
 *
 * A true half-and-half split at `lg` and above: the approved photograph and brand copy hold the
 * left column edge-to-edge, and the form column holds the right. The previous shell centred a
 * `max-w-md` card inside a `max-w-6xl` grid, which left a wide empty gutter on either side of the
 * form and read as a stock template — the panel was a plain navy rectangle with a skyline so faint
 * it was invisible.
 *
 * The form column, not the card, is the surface here: no nested bordered box floating on a muted
 * background, just a properly proportioned column with the controls in it. `AuthCard` supplies the
 * heading block; each page supplies its own form.
 *
 * Chrome-free by design — no public header or footer — so nothing competes with the single task on
 * screen. Language, theme, Back to Home and the legal links are all still reachable.
 */
export function AuthLayout() {
  return (
    <div className="min-h-svh bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <AuthBrandPanel />

      {/*
        Below `lg` there is no grid, so the column carries its own `min-h-svh` to fill the screen and
        keep the footer links at the bottom rather than floating under the submit button. At `lg` the
        grid item already stretches to the row, so it drops back to `min-h-0` — asserting `min-h-svh`
        in both places makes the taller of two viewport measurements win and pushes the page into a
        scrollbar it does not need.
      */}
      <div className="flex min-h-svh flex-col px-5 py-6 sm:px-8 lg:min-h-0 lg:px-12 xl:px-16">
        <header className="flex items-center justify-between gap-4">
          <BackToHomeLink />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center py-10">
          <div className="mx-auto w-full max-w-[27rem]">
            <RouteSuspense><Outlet /></RouteSuspense>
          </div>
        </main>

        <footer className="mx-auto w-full max-w-[27rem]">
          <AuthFooterLinks />
        </footer>
      </div>
    </div>
  )
}
