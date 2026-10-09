import { useTranslation } from 'react-i18next'
import { Badge, Card } from '../../../components/ui'
import { SocialIcon } from '../../../components/ui/SocialIcon'
import type { StudentProfessionalProfile } from '../types'

export function ProfessionalProfileSummary({ profile }: { profile?: StudentProfessionalProfile | null }) {
  const { t } = useTranslation()
  if (!profile) return null
  return <Card padding="lg" className="space-y-4">
    {profile.headline && <p className="font-display text-title-panel text-foreground">{profile.headline}</p>}
    {(profile.city || profile.countryCode) && <p className="text-sm text-muted">{[profile.city, profile.countryCode].filter(Boolean).join(', ')}</p>}
    {profile.summary && <section><h2 className="font-bold">{t('common:professional.about')}</h2><p className="mt-2 whitespace-pre-line text-sm leading-7">{profile.summary}</p></section>}
    {!!profile.skills?.length && <section><h2 className="mb-2 font-bold">{t('common:professional.skills')}</h2><div className="flex flex-wrap gap-2">{profile.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div></section>}
    <div className="flex flex-wrap gap-3">{(['linkedinUrl', 'githubUrl', 'portfolioUrl'] as const).map((key) => profile[key] && <a key={key} href={profile[key]} target="_blank" rel="noopener noreferrer" aria-label={t(`common:professional.${key}`)} title={t(`common:professional.${key}`)} className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-link focus-visible:ring-2 focus-visible:ring-focus-ring"><SocialIcon platform={key === 'linkedinUrl' ? 'linkedin' : key === 'githubUrl' ? 'github' : 'portfolio'} /></a>)}</div>
  </Card>
}
