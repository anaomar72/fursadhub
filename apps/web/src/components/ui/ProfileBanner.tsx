import { useState } from 'react'
import { cn } from '../../lib/utils/cn'

export interface ProfileBannerProps {
  /** The entity's uploaded cover image. Omit when the backend reports none. */
  coverUrl?: string
  className?: string
  variant?: 'compact' | 'public'
  imageLabel?: string
  viewLabel?: string
}

/**
 * Responsive public cover with a compact default for existing portal consumers.
 *
 * <p>When no cover has been uploaded — or the request for it fails — the band falls back to the
 * brand navy artwork rather than a broken image or an empty gap, so every profile has the same
 * silhouette whether or not its owner has supplied artwork.
 */
export function ProfileBanner({ coverUrl, className, variant = 'compact', imageLabel, viewLabel }: ProfileBannerProps) {
  const [failedUrl, setFailedUrl] = useState<string | undefined>()
  const showImage = Boolean(coverUrl) && failedUrl !== coverUrl

  return (
    <div
      aria-hidden={imageLabel ? undefined : true}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border border-border',
        variant === 'public' ? 'fh-profile-cover' : 'h-28 sm:h-40',
        !showImage && 'fh-cover-fallback bg-brand-navy',
        className,
      )}
    >
      {showImage && (
        <img src={coverUrl} alt={imageLabel ?? ''} decoding="async" fetchPriority={variant === 'public' ? 'high' : undefined} onError={() => setFailedUrl(coverUrl)} className="size-full object-cover object-center" />
      )}
      {showImage && viewLabel && <a href={coverUrl} target="_blank" rel="noopener noreferrer" className="absolute end-3 top-3 inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 py-2 text-label text-foreground shadow-xs hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">{viewLabel}</a>}
    </div>
  )
}
