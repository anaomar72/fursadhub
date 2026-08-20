import { useTranslation } from 'react-i18next'
import { RoleShell } from './RoleShell'

export function OrganizationLayout() {
  const { t } = useTranslation()
  return <RoleShell areaLabel={t('nav.organization')} />
}
