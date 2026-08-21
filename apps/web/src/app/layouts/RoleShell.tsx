import { Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLogo } from '../../components/ui'
import { useAuth } from '../../lib/auth/AuthContext'

interface RoleShellProps {
  /** Role-area label shown next to the brand mark, e.g. "Student". Translated by the caller. */
  areaLabel: string
}

/**
 * Shared topbar/content shell for the role-scoped areas (Student, University,
 * Organization, Admin). Navigation content differs per role and is supplied
 * by each area's own routes/features — this only establishes the consistent
 * chrome so every area clearly belongs to one FursadHub product
 * (BRAND_AND_UI_GUIDELINES.md section 6). Not exported outside app/layouts.
 */
export function RoleShell({ areaLabel }: RoleShellProps) {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo surface="light" className="h-8" />
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground-secondary">
              {areaLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm font-medium text-foreground-secondary hover:text-foreground"
          >
            {t('auth:session.signOut')}
          </button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
