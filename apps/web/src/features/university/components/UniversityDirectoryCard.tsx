import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar, Icon, VerifiedBadge } from '../../../components/ui'

/** The narrow public university tile; every identity field comes from the directory. */
export function UniversityDirectoryCard({ id, name, verified, imageUrl, city, description }: {
  id: string; name: string; verified: boolean; imageUrl?: string; city?: string | null; description?: string | null
}) {
  const { t } = useTranslation()
  return <article className="flex h-full min-h-72 flex-col rounded-lg border border-border bg-surface p-3.5 shadow-xs">
    <div className="flex items-start gap-2.5">
      <Avatar name={name} src={imageUrl} shape="square" className="size-12 shrink-0" />
      <div className="min-w-0"><h2 className="break-words font-display text-xs font-extrabold leading-5 text-brand-navy dark:text-foreground">{name}</h2>{verified && <VerifiedBadge variant="label" size="sm" className="mt-1" />}</div>
    </div>
    {city && <p className="mt-4 flex items-center gap-1 text-[11px] text-foreground-secondary"><Icon name="globe" className="size-3 shrink-0" />{city}</p>}
    <p className="mt-3 line-clamp-5 text-xs leading-5 text-foreground-secondary">{description || t('common:remediation.notProvided')}</p>
    <div className="mt-auto pt-5"><Link to={`/universities/${id}`} className="flex min-h-9 items-center justify-center rounded-md border border-brand-accent/50 px-2 text-xs font-bold text-brand-accent-ink hover:bg-brand-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">{t('common:publicPages.universities.view')}</Link></div>
  </article>
}
