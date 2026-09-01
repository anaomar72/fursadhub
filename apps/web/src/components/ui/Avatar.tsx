import { useState } from 'react'
import { cn } from '../../lib/utils/cn'

export interface AvatarProps {
  /** A resolved image source — a public logo URL, or a blob URL from useAvatarSrc. Omit to show the fallback. */
  src?: string | null
  /** Used for the initials fallback and the accessible label. */
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
}

/**
 * A person's profile picture, or an organization's/university's logo (Phase 8). Falls back to
 * initials-on-a-circle when no image is available — never a broken-image icon, and never empty.
 */
export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  // Direct-URL logos (public, unlike personal avatars) may 404 if none has been uploaded yet —
  // fall back to initials rather than a broken-image icon.
  const [failed, setFailed] = useState(false)

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        className={cn('rounded-full object-cover', SIZE_CLASSES[size], className)}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'flex items-center justify-center rounded-full bg-brand-secondary font-semibold text-on-brand',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {initials || '?'}
    </span>
  )
}
