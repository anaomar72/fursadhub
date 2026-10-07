import { useTranslation } from 'react-i18next'
import { ButtonLink, EntityCard } from '../../../components/ui'

/**
 * A university in the public directory. The same {@link EntityCard} the organization directory uses,
 * so the two directories read as one product: logo and name with the verification check, the city,
 * the university's own description, and the profile link. Every field comes from the directory.
 */
export function UniversityDirectoryCard({ id, name, verified, imageUrl, city, description }: {
  id: string; name: string; verified: boolean; imageUrl?: string; city?: string | null; description?: string | null
}) {
  const { t } = useTranslation()
  return (
    <EntityCard
      className="h-full"
      name={name}
      verified={verified}
      imageUrl={imageUrl}
      subtitle={city ?? undefined}
      description={description || t('common:remediation.notProvided')}
      actions={
        <ButtonLink to={`/universities/${id}`} variant="outline" size="sm">
          {t('common:publicPages.universities.view')}
        </ButtonLink>
      }
    />
  )
}
