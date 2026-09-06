import { useState } from 'react'
import { cn } from '../../lib/utils/cn'

export interface ProfileBannerProps {
  /** The entity's uploaded cover image. Omit when the backend reports none. */
  coverUrl?: string
  className?: string
}

/**
 * The wide cover band an organization or university profile opens with
 * (design-reference/presentation-refresh-2026, reference 05).
 *
 * <p>When no cover has been uploaded — or the request for it fails — the band falls back to the
 * brand navy gradient rather than a broken image or an empty gap, so every profile has the same
 * silhouette whether or not its owner has supplied artwork.
 */
export function ProfileBanner({ coverUrl, className }: ProfileBannerProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(coverUrl) && !failed

  return (
    <div
      aria-hidden="true"
      className={cn(
        'h-28 w-full overflow-hidden rounded-xl border border-border sm:h-40',
        !showImage && 'bg-brand-navy bg-gradient-to-br from-brand-navy to-brand-navy-deep',
        className,
      )}
    >
      {showImage && (
        <img src={coverUrl} alt="" onError={() => setFailed(true)} className="size-full object-cover" />
      )}
    </div>
  )
}
