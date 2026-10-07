import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import skyline from '../../assets/presentation/skyline.webp'

/**
 * The skyline silhouette behind the footer and the About band.
 *
 * <p>The asset IS what the page draws: white pixels shaped by the original alpha channel. It used
 * to be full-colour navy line art that both call sites immediately threw away with
 * `brightness-0 invert`, which cost 579KB to deliver colour no visitor ever saw, plus a
 * full-width filter pass on every paint. Now it ships at 23KB and needs no filter.
 */
export function SkylineArtwork({ className = '' }: { className?: string }) {
  return <img src={skyline} alt="" loading="lazy" decoding="async" width={1200} height={400} className={`pointer-events-none object-contain ${className}`} />
}

/*
 * The public-site promotional pieces that used to live here — the navy CTA band, the in-page section
 * strip, the marketplace side rail and the explanatory illustrations — were retired in the Phase 3
 * public redesign: the rail pointed anonymous visitors at signed-in portal routes, and the band and
 * illustrations were replaced by sections built from the shared type scale and `PublicContainer`.
 */

/** A titled, bordered group of profile/opportunity form fields (portal forms; see FormSection for new work). */
export function ProfileFormSection({ title, hint, icon, children }: { title: string; hint?: string; icon: IconName; children: ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
    <header className="flex items-start gap-3 border-b border-border px-5 py-4"><span className="rounded-lg bg-brand-blue-soft p-2 text-brand-blue"><Icon name={icon} className="size-5" /></span><div><h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">{title}</h2>{hint && <p className="mt-1 text-xs leading-5 text-foreground-secondary">{hint}</p>}</div></header>
    <div className="grid gap-5 p-5 sm:grid-cols-2 [&>*:only-child]:col-span-full">{children}</div>
  </section>
}
