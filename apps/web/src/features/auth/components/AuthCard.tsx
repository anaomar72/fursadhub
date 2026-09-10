import type { ReactNode } from 'react'
import { AuthMobileBrandStrip } from './AuthShell'

export interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/**
 * The heading block each auth page sits under.
 *
 * `AuthLayout` owns the column, the brand panel, Back to Home, the language/theme controls and the
 * legal footer, so this no longer draws a bordered card floating on a muted background — that
 * nested-box treatment is what made the form look small inside its own column. What remains is the
 * page's own identity: the mobile brand strip (the photo panel is desktop-only), the title, the
 * supporting line, and the form.
 *
 * The heading is left-aligned. Centred headings over left-aligned labelled inputs is the stock
 * pattern the brief asked to move away from; aligning both to the same edge is what makes the
 * column read as composed.
 */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="animate-hero-fade motion-reduce:animate-none">
      <AuthMobileBrandStrip />

      <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-brand-navy dark:text-foreground lg:mt-0 lg:text-[2rem]">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-sm leading-6 text-foreground-secondary">{subtitle}</p>}

      <div className="mt-8">{children}</div>
    </div>
  )
}
