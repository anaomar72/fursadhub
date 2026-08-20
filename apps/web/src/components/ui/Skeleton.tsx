import { cn } from '../../lib/utils/cn'

export interface SkeletonProps {
  className?: string
}

/** Loading placeholder for cards/lists/tables — see BRAND_AND_UI_GUIDELINES.md section 19. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none', className)}
    />
  )
}
