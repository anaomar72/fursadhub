import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AreaTabs } from '../../../app/layouts/AreaTabs'

export function StudentAreaLayout() {
  const { t } = useTranslation()
  return (
    <>
      <AreaTabs
        items={[
          { to: '/student/dashboard', label: t('student:nav.dashboard') },
          { to: '/student/enrollment', label: t('student:nav.enrollment') },
          { to: '/student/applications', label: t('recruitment:nav.applications') },
          { to: '/student/nominations', label: t('recruitment:nav.nominations') },
          { to: '/student/placements', label: t('placements:nav.myPlacements') },
          { to: '/student/profile', label: t('student:nav.profile') },
        ]}
      />
      <Outlet />
    </>
  )
}
