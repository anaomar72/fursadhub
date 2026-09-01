import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import { Avatar, LoadingSpinner, PageHeader, VerifiedBadge } from '../../../components/ui'

/** A university's public profile (Phase 8) — the exact counterpart of
 * organization/pages/PublicOrganizationProfilePage.tsx. No account required. */
export function PublicUniversityProfilePage() {
  const { t } = useTranslation()
  const { universityId } = useParams<{ universityId: string }>()

  const universityQuery = useQuery({
    queryKey: ['public-university', universityId],
    queryFn: () => universityApi.getPublicUniversity(universityId!),
    enabled: !!universityId,
    retry: false,
  })

  if (universityQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (universityQuery.isError || !universityQuery.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-foreground-secondary">{t('university:publicProfile.notFound')}</p>
      </div>
    )
  }

  const university = universityQuery.data

  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar
          src={university.hasLogo ? universityApi.universityLogoUrl(university.id) : null}
          name={university.name}
          size="lg"
        />
        <div>
          <div className="flex items-center gap-2">
            <PageHeader title={university.name} />
            {university.verified && <VerifiedBadge />}
          </div>
          {university.city && <p className="text-sm text-foreground-secondary">{university.city}</p>}
        </div>
      </div>

      {university.description && (
        <p className="mt-6 whitespace-pre-line text-sm text-foreground-secondary">{university.description}</p>
      )}

      {university.website && (
        <a
          href={university.website}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium text-brand-primary hover:underline"
        >
          {university.website}
        </a>
      )}
    </article>
  )
}
