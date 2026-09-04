import { Outlet } from 'react-router-dom'
import { LanguageToggle, ThemeToggle } from '../../components/ui'

/**
 * Standalone shell for the auth screens (login/register/forgot/reset/verify) — approved design
 * references 06-09 show a focused, chrome-free card rather than the full public marketing
 * header/footer used by PublicLayout. AuthCard already carries the brand logo centered above the
 * card, so this shell only adds the language/theme controls that would otherwise disappear.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-surface-muted">
      <div className="flex justify-end px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <Outlet />
      </main>
    </div>
  )
}
