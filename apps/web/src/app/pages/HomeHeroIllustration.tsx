import { useTranslation } from 'react-i18next'
import { BrandLogo, Icon, type IconName } from '../../components/ui'

const PILLS = [
  { key: 'verified', icon: 'badgeCheck', tone: 'text-brand-blue', position: 'start-1 top-4 sm:-start-5' },
  { key: 'learn', icon: 'graduationCap', tone: 'text-brand-navy dark:text-foreground', position: 'bottom-8 start-2 sm:-start-6' },
  { key: 'grow', icon: 'chart', tone: 'text-success', position: 'bottom-4 end-1 sm:-end-5' },
] as const

/**
 * The hero visual from the approved landing page (reference 01): a tall rounded panel with three
 * floating cards overlapping its edges.
 *
 * <p>The reference fills the panel with a commissioned photograph. There is no such asset in the
 * repository and one must not be invented, so the panel is the canonical brand mark over the
 * navy skyline motif that already runs through the approved footer and call-to-action band. The
 * three floating cards, their icons and their copy follow the reference exactly.
 */
export function HomeHeroIllustration() {
  const { t } = useTranslation()

  return (
    <div className="relative mx-auto w-full max-w-[620px] px-2 sm:px-7">
      <div className="surface-dark relative flex aspect-[2.07/1] items-center justify-center overflow-hidden rounded-2xl bg-surface">
        <Skyline />
        <div className="relative flex flex-col items-center gap-2 px-6 text-center">
          <BrandLogo surface="dark" markOnly size="lg" className="size-11" />
          <p className="font-display text-lg font-extrabold tracking-tight text-white">
            Fursad<span className="text-brand-accent">Hub</span>
          </p>
          <p className="max-w-[18rem] text-xs text-white/70">{t('common:app.tagline')}</p>
        </div>
      </div>

      {PILLS.map((pill) => (
        <div
          key={pill.key}
          className={`absolute ${pill.position} flex max-w-[11rem] items-start gap-2 rounded-xl border border-border bg-surface p-2.5 shadow-md`}
        >
          <span className={`mt-0.5 shrink-0 ${pill.tone}`}>
            <Icon name={pill.icon as IconName} className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold text-brand-navy dark:text-foreground">
              {t(`common:landing.pills.${pill.key}.title`)}
            </span>
            <span className="mt-0.5 block text-[11px] leading-4 text-foreground-secondary">
              {t(`common:landing.pills.${pill.key}.body`)}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Decorative only — the same skyline line-work the approved footer and CTA band use. */
function Skyline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 140"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 w-full text-white/10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 140V88h28v52M34 100h24v40M58 70h20v70M78 108h22v32M100 50h32v90M132 86h26v54M158 64h22v76M180 98h28v42M208 40h30v100M238 78h24v62M262 58h28v82M290 94h22v46M312 46h32v94M344 82h26v58M370 100h28v40" />
      <path d="M116 50V34M125 34h6M223 40V22M232 22h6M328 46V30M337 30h6" />
    </svg>
  )
}
