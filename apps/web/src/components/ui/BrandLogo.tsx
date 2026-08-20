import logoLight from '../../assets/brand/logo-light.png'
import logoDark from '../../assets/brand/logo-dark.png'
import { cn } from '../../lib/utils/cn'

export interface BrandLogoProps {
  /** Which approved logo variant to render — light surfaces vs. dark/navy surfaces. */
  surface?: 'light' | 'dark'
  className?: string
}

/**
 * Approved FursadHub logo lockup (FH monogram, doorway, wordmark, tagline).
 * Do not redraw/recolor/distort — see docs/product/BRAND_AND_UI_GUIDELINES.md
 * section 1. Cropped directly from the approved reference sheet pending
 * individually exported production assets.
 */
export function BrandLogo({ surface = 'light', className }: BrandLogoProps) {
  return (
    <img
      src={surface === 'dark' ? logoDark : logoLight}
      alt="FursadHub — Opening doors to your future."
      className={cn('h-10 w-auto', className)}
    />
  )
}
