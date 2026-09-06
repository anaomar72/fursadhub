import type { ReactNode } from 'react'
import { BrandLogo } from '../../../components/ui'

export interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Shared centered card shell for register/login/verify/forgot/reset pages (design references 06-09). */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md animate-hero-fade motion-reduce:animate-none">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-10">
        <div className="mb-6 flex justify-center">
          <BrandLogo surface="light" />
        </div>
        <h1 className="text-center font-display text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-center text-sm text-foreground-secondary">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}
