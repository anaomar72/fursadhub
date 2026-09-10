import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAdminSession } from './AdminSessionContext'
import { adminCapabilities, adminLandingPath, type AdminCapabilities } from '../adminCapabilities'

/**
 * Route-level capability gate for the platform console.
 *
 * <p>Reads the SAME {@link adminCapabilities} flags the sidebar reads, so a destination the
 * navigation hides is also unreachable by typing its URL. There is no permission logic here — it
 * takes the name of a flag and asks the one module that already owns the answer, which is itself a
 * one-for-one mirror of {@code PlatformAuthorization}.
 *
 * <p><strong>This is UX, not security.</strong> The backend re-authorizes every admin request from
 * current PostgreSQL data (CLAUDE.md section 24), and that is what actually refuses a verification
 * officer who forges one. What this fixes is the other half: a verification officer could previously
 * open {@code /admin/users}, {@code /admin/audit}, {@code /admin/platform-roles} or the dashboard
 * and watch every query on the page come back 403 — a boundary that reads as a broken console.
 * Worse, the page mounted and fired those requests before anything refused them.
 *
 * <p>Placed as a pathless layout route INSIDE {@code AdminAreaLayout}, so the platform session is
 * already resolved when it runs. The guarded page therefore never mounts, never paints and never
 * fires its queries before the decision is made.
 *
 * <p>A caller holding a platform grant but no capability this console has a page for is refused
 * outright rather than redirected: {@link adminLandingPath} returns {@code null} for them, and
 * bouncing them toward another guarded route would loop between the two. Fail closed, without a
 * loop.
 */
export function RequirePlatformCapability({ capability }: { capability: keyof AdminCapabilities }) {
  const { t } = useTranslation()
  const session = useAdminSession()
  const can = adminCapabilities(session)

  if (can[capability]) {
    return <Outlet />
  }

  const landing = adminLandingPath(session)
  if (!landing) {
    return (
      <p className="px-4 py-10 text-center text-sm text-foreground-secondary">
        {t('admin:nav.noAccess')}
      </p>
    )
  }

  return <Navigate to={landing} replace />
}

/**
 * The {@code /admin} index. Sends each platform role to the first destination it can actually use.
 *
 * <p>Previously a fixed redirect to the organization queue, which sent a Super Admin past their own
 * dashboard to a page that is a verification officer's job. {@link adminLandingPath} answers per
 * role, from the same flags that built the sidebar, so the landing page is always the first item in
 * the caller's own navigation.
 */
export function AdminLandingRedirect() {
  const { t } = useTranslation()
  const session = useAdminSession()
  const landing = adminLandingPath(session)

  if (!landing) {
    return (
      <p className="px-4 py-10 text-center text-sm text-foreground-secondary">
        {t('admin:nav.noAccess')}
      </p>
    )
  }

  return <Navigate to={landing} replace />
}
