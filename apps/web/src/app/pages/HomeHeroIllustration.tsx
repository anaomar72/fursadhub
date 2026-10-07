import { useTranslation } from 'react-i18next'
import { VerifiedBadge } from '../../components/ui'
import heroPhoto from '../../assets/presentation/hero-woman.webp'
import heroPhotoSmall from '../../assets/presentation/hero-woman-800.webp'

/**
 * The home page's approved hero photograph (design-reference/presentation-refresh-2026). It depicts
 * no platform user, tenant or verification record.
 *
 * <p>This is the home page's LCP element, so it stays eager and high priority, with a `srcset`: a
 * phone takes the 800w file and never pays for the 1440w one. `width`/`height` reserve the box, so
 * the page does not shift when it paints.
 *
 * <p>One quiet caption, not three floating badges. The earlier "Learn" and "Grow" pills made
 * claims the platform does not measure and turned the photograph into a collage; the single chip
 * left states something the product actually does — it verifies the universities and organizations
 * on it.
 */
export function HomeHeroIllustration() {
  const { t } = useTranslation()
  return (
    <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-muted">
      <img
        src={heroPhoto}
        srcSet={`${heroPhotoSmall} 800w, ${heroPhoto} 1440w`}
        sizes="(min-width: 1024px) 560px, 100vw"
        alt=""
        fetchPriority="high"
        decoding="async"
        width={1440}
        height={810}
        className="absolute inset-0 size-full object-cover object-[62%_40%]"
      />
      <div className="absolute bottom-4 start-4 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-lg bg-white/95 px-3.5 py-2.5 shadow-md">
        <VerifiedBadge size="sm" />
        <span className="min-w-0">
          <span className="block text-label text-brand-navy">{t('common:landing.capabilities.entities.title')}</span>
          <span className="block text-caption text-slate-600">{t('common:landing.capabilities.entities.body')}</span>
        </span>
      </div>
    </div>
  )
}
