import markNavy from '../../assets/brand/fursadhub-mark-navy.png'
import markWhite from '../../assets/brand/fursadhub-mark-white.png'
import { cn } from '../../lib/utils/cn'

export interface BrandLogoProps {
  /**
   * Which approved mark to render. `light` is the navy tile, for white/near-white surfaces;
   * `dark` is the white tile, for the navy rails, bands and footer.
   */
  surface?: 'light' | 'dark'
  /** The mark on its own — app rail, favicon-sized contexts, the "powered by" strip. */
  markOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Adds the approved tagline under the wordmark. Only where there is room for it. */
  withTagline?: boolean
  className?: string
}

const MARK_SIZE = { sm: 'size-7', md: 'size-9', lg: 'size-11' } as const
const WORD_SIZE = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' } as const

/**
 * The canonical FursadHub identity, from `design-reference/presentation-refresh-2026`.
 *
 * <p>The mark is the APPROVED RASTER ASSET, exported from the canonical logo sheet
 * (`redesigned brand/brand logo.png`) at its two approved tile treatments — navy tile for light
 * surfaces, white tile for dark. It is never redrawn, recoloured or substituted.
 *
 * <p>The wordmark is set as live text, matching how the mockups render it in every navigation
 * chrome: `Fursad` in the surface's own ink, `Hub` in the brand accent. Live text keeps the lockup
 * crisp at every rail width and in both themes, which a fixed-canvas raster wordmark cannot.
 */
export function BrandLogo({
  surface = 'light',
  markOnly = false,
  size = 'md',
  withTagline = false,
  className,
}: BrandLogoProps) {
  // 'dark' is an always-dark context (a navy band, the navy rail, the footer), so it pins the
  // white tile. 'light' means whatever the page surface is — light in the light theme, and dark
  // once the visitor switches themes — so it carries BOTH marks and lets the theme choose.
  const mark =
    surface === 'dark' ? (
      <img src={markWhite} alt="" className={cn(MARK_SIZE[size], 'shrink-0 object-contain', markOnly && className)} />
    ) : (
      <>
        <img
          src={markNavy}
          alt=""
          className={cn(MARK_SIZE[size], 'shrink-0 object-contain dark:hidden', markOnly && className)}
        />
        <img
          src={markWhite}
          alt=""
          className={cn(MARK_SIZE[size], 'hidden shrink-0 object-contain dark:block', markOnly && className)}
        />
      </>
    )

  if (markOnly) return mark

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      {mark}
      <span className="min-w-0">
        <span
          className={cn(
            'block truncate font-display font-extrabold leading-none tracking-tight',
            WORD_SIZE[size],
            surface === 'dark' ? 'text-white' : 'text-brand-navy dark:text-white',
          )}
        >
          Fursad<span className="text-brand-accent">Hub</span>
        </span>
        {withTagline && (
          <span
            className={cn(
              'mt-1 block truncate text-[11px] leading-none',
              surface === 'dark' ? 'text-white/70' : 'text-foreground-secondary',
            )}
          >
            Opportunities for a Brighter Tomorrow
          </span>
        )}
      </span>
    </span>
  )
}
