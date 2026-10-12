import type { ReactNode } from 'react'

export interface AuthCardProps {
  title: string
  subtitle?: ReactNode
  children: ReactNode
}

/**
 * The heading block each auth page sits under: the page's single `<h1>`, one supporting line, then
 * the page's own form.
 *
 * <p>`AuthLayout` owns the column, the brand panel, the way home, the language/theme controls and
 * the legal footer, so this draws no bordered card: the form column is the surface. The heading is
 * left-aligned to the same edge as the labelled fields below it.
 */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="animate-hero-fade motion-reduce:animate-none">
      <h1 className="break-words font-display text-title-page text-foreground">{title}</h1>
      {subtitle && <p className="mt-2 break-words text-body-lg text-foreground-secondary">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </div>
  )
}
