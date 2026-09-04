import type { ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface PageContainerProps {
  children: ReactNode
  /** `narrow` for single-column forms/settings; `wide` for tables and dashboards. */
  width?: 'narrow' | 'wide'
  className?: string
}

/** The content column inside {@link AppShell} — one place that owns page gutters and max width. */
export function PageContainer({ children, width = 'wide', className }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-6 sm:px-6 lg:px-8',
        width === 'narrow' ? 'max-w-3xl' : 'max-w-7xl',
        className,
      )}
    >
      {children}
    </div>
  )
}
