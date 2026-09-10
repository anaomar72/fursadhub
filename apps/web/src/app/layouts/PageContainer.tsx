import type { ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface PageContainerProps {
  children: ReactNode
  /** `narrow` for single-column forms/settings; `wide` for tables and dashboards. */
  width?: 'narrow' | 'wide'
  className?: string
}

/**
 * The content column inside {@link AppShell} — one place that owns page gutters and max width.
 *
 * <p>Its vertical rhythm comes from the workspace family rather than from a fixed value, which is
 * how the same page reads roomier in the student workspace and tighter in the organization one
 * without either being a different component. See the `[data-workspace]` block in `index.css`.
 */
export function PageContainer({ children, width = 'wide', className }: PageContainerProps) {
  return (
    <div
      style={{ paddingBlock: 'var(--workspace-page-y)' }}
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        width === 'narrow' ? 'max-w-3xl' : 'max-w-7xl',
        className,
      )}
    >
      {children}
    </div>
  )
}
