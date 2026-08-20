import { createBrowserRouter } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicLayout, StudentLayout, UniversityLayout, OrganizationLayout, AdminLayout } from '../layouts'
import { HomePage } from '../pages/HomePage'
import { ComingSoonPage } from '../pages/ComingSoonPage'
import { NotFoundPage } from '../pages/NotFoundPage'

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
 * Route foundation only — one route per role-area layout, proving the
 * PublicLayout/StudentLayout/UniversityLayout/OrganizationLayout/AdminLayout
 * shells wire up correctly. Real feature routes are added phase by phase.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [{ index: true, element: <HomePage /> }],
  },
  {
    path: '/student',
    element: <StudentLayout />,
    children: [{ index: true, element: <StudentIndex /> }],
  },
  {
    path: '/university',
    element: <UniversityLayout />,
    children: [{ index: true, element: <UniversityIndex /> }],
  },
  {
    path: '/organization',
    element: <OrganizationLayout />,
    children: [{ index: true, element: <OrganizationIndex /> }],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [{ index: true, element: <AdminIndex /> }],
  },
  { path: '*', element: <NotFoundPage /> },
])
