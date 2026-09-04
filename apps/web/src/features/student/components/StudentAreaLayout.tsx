import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../app/layouts/AppShell'
import { buildStudentNav } from './studentNavigation'

export function StudentAreaLayout() {
  const { t } = useTranslation()
  return <AppShell areaLabel={t('common:nav.student')} sections={buildStudentNav(t)} />
}
