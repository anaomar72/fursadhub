import { useTranslation } from 'react-i18next'
import { Icon } from '../../components/ui'
import heroPhoto from '../../assets/presentation/hero-woman.png'

const PILLS = [
  { key: 'verified', icon: 'badgeCheck', tone: 'text-brand-blue', position: 'start-3 top-5' },
  { key: 'learn', icon: 'graduationCap', tone: 'text-brand-blue', position: 'bottom-4 start-3' },
  { key: 'grow', icon: 'chart', tone: 'text-success', position: 'bottom-10 end-3' },
] as const

/** Approved decorative photography, refs 01–02. The standalone approved hero photograph is a static presentation asset.
 * The photograph depicts no platform user, tenant, or verification record. */
export function HomeHeroIllustration({ marketplace = false }: { marketplace?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className={`relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-surface-muted shadow-xs ${marketplace ? 'aspect-[626/250]' : 'aspect-[616/292]'}`}>
      <img src={heroPhoto} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover object-[center_45%]" />
      {PILLS.map((pill) => (
        <div key={pill.key} className={`absolute ${pill.position} flex w-[min(8.5rem,30%)] items-start gap-2 rounded-lg border border-white/60 bg-white/95 p-2 shadow-sm sm:p-2.5`}>
          <Icon name={pill.icon} className={`mt-0.5 size-4 shrink-0 ${pill.tone}`} />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-brand-navy">{t(`common:landing.pills.${pill.key}.title`)}</span>
            <span className="mt-0.5 hidden text-[11px] leading-4 text-slate-600 sm:block">{t(`common:landing.pills.${pill.key}.body`)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
