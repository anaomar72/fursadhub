import { Outlet } from 'react-router-dom'
import { BrandLogo } from '../../components/ui'

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
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <BrandLogo surface="light" className="h-8" />
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground-secondary">
            {areaLabel}
          </span>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
