import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as organizationApi from '../api/organizationApi'
import { Avatar, LoadingSpinner, PageHeader, VerifiedBadge } from '../../../components/ui'

/**
 * An organization's public profile (Phase 8) — no account required. This is the trust surface the
 * verified badge exists for: its own name, logo, description and verification status, the way the
 * organization has chosen to present itself.
 */
export function PublicOrganizationProfilePage() {
  const { t } = useTranslation()
  const { organizationId } = useParams<{ organizationId: string }>()

  const organizationQuery = useQuery({
    queryKey: ['public-organization', organizationId],
    queryFn: () => organizationApi.getPublicOrganization(organizationId!),
    enabled: !!organizationId,
    retry: false,
  })

  if (organizationQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (organizationQuery.isError || !organizationQuery.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-foreground-secondary">{t('organization:publicProfile.notFound')}</p>
      </div>
    )
  }

  const organization = organizationQuery.data

  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar
          src={organization.hasLogo ? organizationApi.organizationLogoUrl(organization.id) : null}
          name={organization.name}
          size="lg"
        />
        <div>
          <div className="flex items-center gap-2">
            <PageHeader title={organization.name} />
            {organization.verified && <VerifiedBadge />}
          </div>
          <p className="text-sm text-foreground-secondary">{t(`organization:profile.types.${organization.type}`)}</p>
        </div>
      </div>

      {organization.description && (
        <p className="mt-6 whitespace-pre-line text-sm text-foreground-secondary">{organization.description}</p>
      )}

      {organization.website && (
        <a
          href={organization.website}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium text-brand-primary hover:underline"
        >
          {organization.website}
        </a>
      )}

      <Link
        to={`/opportunities?organization=${organization.id}`}
        className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors duration-150 ease-in-out hover:bg-surface-muted"
      >
        {t('organization:publicProfile.viewOpportunities')}
      </Link>
    </article>
  )
}
