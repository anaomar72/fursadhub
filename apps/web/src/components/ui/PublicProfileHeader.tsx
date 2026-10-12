import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from './Avatar'
import { ProfileBanner } from './ProfileBanner'
import { VerifiedBadge } from './VerifiedBadge'
import { Skeleton } from './Skeleton'

interface PublicProfileHeaderProps {
  name: string
  coverUrl?: string
  logoUrl?: string
  verified?: boolean
  subtitle?: string
  description?: string | null
  actions?: ReactNode
  children?: ReactNode
}

/** Only the logo overlaps the cover; text and actions remain in normal flow. */
export function PublicProfileHeader({
  name, coverUrl, logoUrl, verified, subtitle, description, actions, children,
}: PublicProfileHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className="fh-profile-header mt-6 overflow-hidden rounded-xl border border-border bg-surface">
      <ProfileBanner
        coverUrl={coverUrl}
        variant="public"
        viewLabel={t('common:astra.viewCover')}
        imageLabel={t('common:astra.cover', { name })}
        className="rounded-none border-0"
      />
      <div className="px-5 pb-6 sm:px-8 sm:pb-8">
        <Avatar
          name={name}
          src={logoUrl}
          size="lg"
          shape="square"
          className="relative -mt-10 size-24 border-4 border-surface bg-surface shadow-sm sm:-mt-12 sm:size-32"
        />
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words font-display text-title-page text-foreground">{name}</h1>
              {verified && <VerifiedBadge />}
            </div>
            {subtitle && <p className="mt-2 break-words text-body text-foreground-secondary">{subtitle}</p>}
            {description && <p className="mt-3 max-w-prose break-words text-body text-foreground-secondary">{description}</p>}
          </div>
          {actions && <div className="flex min-w-0 flex-wrap items-center gap-2 lg:max-w-sm">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}

export function PublicProfileSkeleton() {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
      <Skeleton className="fh-profile-cover w-full rounded-none" />
      <div className="px-5 pb-8 sm:px-8">
        <Skeleton className="relative -mt-10 size-24 rounded-xl border-4 border-surface sm:-mt-12 sm:size-32" />
        <Skeleton className="mt-5 h-8 w-3/4" />
        <Skeleton className="mt-3 h-5 w-1/2" />
      </div>
    </div>
  )
}
