import type { ReactNode } from 'react'
import { Card } from './Card'
import { Avatar } from './Avatar'
import { VerifiedBadge } from './VerifiedBadge'

export interface EntityCardProps {
  name: string
  subtitle?: string
  imageUrl?: string | null
  /** Renders the approved compact blue check beside the name. */
  verified?: boolean
  /** A short line under the identity block — a description or summary. */
  description?: ReactNode
  /** Left-hand footer content, e.g. an open-opportunity count. */
  meta?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * The approved organization / university directory card (design-reference/presentation-refresh-2026,
 * references 04 and 06): logo and name with the compact verification check, a type-and-place line,
 * the entity's own description, then a ruled footer with a count on the left and the profile link
 * on the right.
 */
export function EntityCard({
  name,
  subtitle,
  imageUrl,
  verified = false,
  description,
  meta,
  actions,
  children,
  className,
}: EntityCardProps) {
  return (
    <Card interactive padding="none" className={['flex h-full flex-col', className].filter(Boolean).join(' ')}>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={name} src={imageUrl} size="lg" shape="square" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h3 className="truncate font-display text-base font-extrabold tracking-tight text-brand-navy dark:text-foreground">
                {name}
              </h3>
              {verified && <VerifiedBadge size="sm" />}
            </div>
            {subtitle && <p className="mt-0.5 truncate text-xs text-foreground-secondary">{subtitle}</p>}
          </div>
        </div>

        {description && <div className="mt-4 line-clamp-3 text-sm leading-6 text-foreground-secondary">{description}</div>}
        {children && <div className="mt-4">{children}</div>}
      </div>

      {(meta || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5">
          {meta ?? <span />}
          {actions}
        </div>
      )}
    </Card>
  )
}
