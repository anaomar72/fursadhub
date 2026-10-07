import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import skyline from '../../assets/presentation/skyline.webp'
import band from '../../assets/presentation/cta-background.webp'
import artOpportunity from '../../assets/presentation/illustration-opportunity.webp'
import artLearning from '../../assets/presentation/illustration-learning.webp'
import artGrowth from '../../assets/presentation/illustration-growth.webp'

/**
 * The skyline silhouette behind the footer strapline and the About band.
 *
 * <p>The asset IS what the page draws: white pixels shaped by the original alpha channel. It used
 * to be full-colour navy line art that both call sites immediately threw away with
 * `brightness-0 invert`, which cost 579KB to deliver colour no visitor ever saw, plus a
 * full-width filter pass on every paint. Now it ships at 23KB and needs no filter.
 */
export function SkylineArtwork({ className = '' }: { className?: string }) {
  return <img src={skyline} alt="" loading="lazy" decoding="async" width={1200} height={400} className={`pointer-events-none object-contain ${className}`} />
}

const EXPLANATORY_ART = { opportunity: artOpportunity, learning: artLearning, growth: artGrowth } as const

/**
 * One of the three explanatory illustrations.
 *
 * <p>These were previously cropped out of a single 2MB sprite sheet with a 640%-wide absolutely
 * positioned `<img>`. Three 80px illustrations do not justify two megabytes, and the crop made the
 * component's geometry depend on undocumented pixel offsets into an artboard. Each tile is now its
 * own 5KB file, extracted from that sheet at exactly the offsets the CSS was using.
 */
export function ExplanatoryArtwork({ kind, className = '' }: { kind: 'opportunity' | 'learning' | 'growth'; className?: string }) {
  return <img src={EXPLANATORY_ART[kind]} alt="" aria-hidden="true" loading="lazy" decoding="async" width={240} height={155} className={`block aspect-[240/155] object-contain ${className}`} />
}

/**
 * The navy call-to-action band that closes the public home page.
 *
 * <p>It carries the page's last ask, and it was being asked to do that at a 16px heading over 12px
 * body inside 16px of vertical padding — a strip thinner than the cards above it, whose skyline
 * artwork had no room to read as anything. Sized properly it now closes the page rather than
 * trailing off it, and the artwork is finally visible behind the copy.
 *
 * <p>The scrim is what makes the artwork usable: the source image is busy on the right, where the
 * buttons sit. A left-to-right navy gradient keeps the copy on solid ground and lets the skyline
 * come through on the side that has no text over it, instead of dimming the whole image evenly and
 * losing it.
 */
export function PresentationBand({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return <section className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-xl border border-white/15 bg-brand-navy px-8 py-9 text-white shadow-sm" style={{ backgroundImage: `url(${band})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/85 to-brand-navy/35" />
    <div className="relative max-w-xl"><h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2><p className="mt-2 text-sm leading-6 text-white/85">{body}</p></div>
    <div className="relative flex flex-wrap gap-3">{children}</div>
  </section>
}

/**
 * The in-page section jump strip.
 *
 * <p><strong>It scrolls, and now it says so.</strong> The strip is a single non-wrapping row —
 * five or six sections will not fit a phone, and wrapping them turns a navigation bar into a block
 * of links. It always had `overflow-x: auto`, but two things stopped that working: an ancestor grid
 * item would not shrink below the strip's intrinsic width, so the strip pushed the whole page wider
 * instead of scrolling inside it; and even once it did scroll there was nothing to suggest anything
 * lay past the right edge, so the later sections read as missing rather than as off-screen.
 *
 * <p>The fade is measured, not assumed: it appears only when there is actually more to reach, and
 * each edge fades independently, so a reader who has scrolled to the end is not told there is more.
 * It is `aria-hidden`, being a hint about geometry rather than content.
 *
 * <p>Scrolling with the keyboard needs no special handling — these are real links, so Tab moves
 * through them and the browser scrolls a focused one into view on its own.
 */
export function SectionNavigation({ items }: { items: { id: string; label: string }[] }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(items[0]?.id)
  const scroller = useRef<HTMLElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const node = scroller.current
    if (!node) return undefined
    const measure = () => {
      const max = node.scrollWidth - node.clientWidth
      // 1px of tolerance: sub-pixel layout leaves a fractional remainder at a true edge.
      setEdges({ start: node.scrollLeft > 1, end: node.scrollLeft < max - 1 })
    }
    measure()
    node.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => {
      node.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [items.length])

  return <div className="relative my-5">
    <nav ref={scroller} aria-label={t('common:remediation.sections')} className="flex min-w-0 gap-4 overflow-x-auto overscroll-x-contain rounded-lg border border-border bg-surface px-4 text-xs font-semibold text-brand-navy [scrollbar-width:thin] dark:text-foreground">
      {items.map(item => <a key={item.id} href={`#${item.id}`} onClick={() => setActive(item.id)} aria-current={active === item.id ? 'location' : undefined} className={`shrink-0 border-b-2 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring ${active === item.id ? 'border-brand-accent' : 'border-transparent hover:border-brand-accent'}`}>{item.label}</a>)}
    </nav>
    {edges.start && <span aria-hidden="true" className="pointer-events-none absolute inset-y-px start-px w-8 rounded-s-lg bg-gradient-to-r from-surface to-transparent" />}
    {edges.end && <span aria-hidden="true" className="pointer-events-none absolute inset-y-px end-px w-8 rounded-e-lg bg-gradient-to-l from-surface to-transparent" />}
  </div>
}

export function ProfileFormSection({ title, hint, icon, children }: { title: string; hint?: string; icon: IconName; children: ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
    <header className="flex items-start gap-3 border-b border-border px-5 py-4"><span className="rounded-lg bg-brand-blue-soft p-2 text-brand-blue"><Icon name={icon} className="size-5" /></span><div><h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">{title}</h2>{hint && <p className="mt-1 text-xs leading-5 text-foreground-secondary">{hint}</p>}</div></header>
    <div className="grid gap-5 p-5 sm:grid-cols-2 [&>*:only-child]:col-span-full">{children}</div>
  </section>
}

export function MarketplaceRail() {
  const { t } = useTranslation()
  /*
    A muted surface with no shadow, deliberately NOT the white card treatment the results use. The
    rail sits in the fourth column beside a three-up grid of internship cards; styled identically it
    read as a fourth search result — directly under a "Showing 1-5 of 5 opportunities" count, which
    made the page look like it was miscounting. Supporting content should look like supporting
    content.
  */
  return <aside className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted p-4">
    <span className="flex size-10 items-center justify-center rounded-full bg-brand-accent-soft text-brand-accent"><Icon name="sparkle" className="size-5" /></span>
    <h2 className="font-display text-sm font-extrabold text-brand-navy dark:text-foreground">{t('common:remediation.railTitle')}</h2>
    <p className="text-xs leading-4 text-foreground-secondary">{t('common:remediation.railBody')}</p>
    <ul className="space-y-3 text-xs leading-4 text-foreground-secondary">{['browse', 'apply', 'track'].map(key => <li key={key} className="flex gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand-accent" />{t(`common:remediation.${key}`)}</li>)}</ul>
    <Link to="/student/opportunities" className="mt-auto rounded-lg bg-action-primary px-3 py-2.5 text-center text-xs font-bold text-on-action hover:bg-action-primary-hover">{t('common:remediation.explore')}</Link>
    <div className="rounded-lg border border-border bg-background p-3"><h3 className="text-xs font-bold">{t('common:landing.ecosystem.organization.title')}</h3><p className="my-2 text-xs leading-4 text-foreground-secondary">{t('common:landing.ecosystem.organization.body')}</p><Link to="/organization/opportunities" className="text-xs font-bold text-link">{t('common:landing.works.organization.cta')} →</Link></div>
  </aside>
}
