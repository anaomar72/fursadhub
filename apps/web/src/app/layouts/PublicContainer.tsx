import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface PublicContainerProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  children: ReactNode
  /** Render as a `<section>` (with `aria-labelledby` passed through) instead of a plain `<div>`. */
  as?: 'div' | 'section'
  /**
   * `section` adds the public vertical rhythm — 40px on a phone, 64px from `lg` up. `none` for a
   * container that only sets width and gutters (a header row, a band whose parent owns spacing).
   */
  spacing?: 'none' | 'section'
}

/**
 * The public site's content column: the 1280px content width and the 16 / 24 / 32px gutters that
 * {@link PageContainer} uses inside the portals, so the marketing pages and the application line up
 * on the same grid.
 *
 * <p>Replaces the hand-written `mx-auto max-w-[1448px] px-4 sm:px-6 lg:px-[54px]` that nine public
 * files repeat today. Those pages move onto this in the public-site phase. It is built now so that
 * phase composes from a primitive instead of re-deciding the width page by page.
 */
export function PublicContainer({ children, as: Tag = 'div', spacing = 'none', className, ...props }: PublicContainerProps) {
  return (
    <Tag
      className={cn(
        'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
        spacing === 'section' && 'py-10 lg:py-16',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}
