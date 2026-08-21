import { createBrowserRouter } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicLayout, StudentLayout, UniversityLayout, OrganizationLayout, AdminLayout } from '../layouts'
import { HomePage } from '../pages/HomePage'
import { ComingSoonPage } from '../pages/ComingSoonPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RequireAuth } from '../../lib/auth/RequireAuth'
import { RegisterPage } from '../../features/auth/pages/RegisterPage'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { VerifyEmailPage } from '../../features/auth/pages/VerifyEmailPage'
import { ForgotPasswordPage } from '../../features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../../features/auth/pages/ResetPasswordPage'

function StudentIndex() {
  const { t } = useTranslation()
  return <ComingSoonPage areaLabel={t('nav.student')} />
}

function UniversityIndex() {
  const { t } = useTranslation()
  return <ComingSoonPage areaLabel={t('nav.university')} />
}

function OrganizationIndex() {
  const { t } = useTranslation()
  return <ComingSoonPage areaLabel={t('nav.organization')} />
}

function AdminIndex() {
  const { t } = useTranslation()
  return <ComingSoonPage areaLabel={t('nav.admin')} />
}

/**
 * Route foundation — PublicLayout now also hosts the Phase 1 authentication pages, and each
 * role-area layout is gated behind RequireAuth (CLAUDE.md section 61 Phase 1 scope; this is UX
 * only, real authorization is enforced by the backend per CLAUDE.md section 24). Real feature
 * routes for each area are added phase by phase.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    path: '/student',
    element: (
      <RequireAuth>
        <StudentLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <StudentIndex /> }],
  },
  {
    path: '/university',
    element: (
      <RequireAuth>
        <UniversityLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <UniversityIndex /> }],
  },
  {
    path: '/organization',
    element: (
      <RequireAuth>
        <OrganizationLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <OrganizationIndex /> }],
  },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <AdminIndex /> }],
  },
  { path: '*', element: <NotFoundPage /> },
])
