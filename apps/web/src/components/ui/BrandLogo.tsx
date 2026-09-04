import brandIcon from '../../assets/brand/Fursad Hub app icon.png'
import brandWordmark from '../../assets/brand/Fursad Hub logo v.png'
import { cn } from '../../lib/utils/cn'

export interface BrandLogoProps {
  /** Which approved logo variant to render — light surfaces vs. dark/navy surfaces. */
  surface?: 'light' | 'dark'
  markOnly?: boolean
  className?: string
}

/**
 * Approved navy/blue FursadHub identity. The supplied raster wordmarks have a
 * white canvas, so live text keeps the lockup crisp and surface-safe.
 */
export function BrandLogo({ surface = 'light', markOnly = false, className }: BrandLogoProps) {
  if (markOnly) return <img src={brandIcon} alt="FursadHub" className={cn('size-10 rounded-lg object-cover', className)} />
  return <span className={cn('relative block h-11 w-44 overflow-hidden rounded-md', surface === 'dark' && 'bg-white', className)}><img src={brandWordmark} alt="FursadHub" className="absolute left-[-10px] top-[-43px] h-[132px] w-[176px] max-w-none" /></span>
}
