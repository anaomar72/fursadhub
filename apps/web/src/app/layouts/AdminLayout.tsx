import { useTranslation } from 'react-i18next'
import { RoleShell } from './RoleShell'

export function AdminLayout() {
  const { t } = useTranslation()
  return <RoleShell areaLabel={t('nav.admin')} />
}
