import type { ReactNode } from 'react'
import { BrandLogo } from '../../../components/ui'

export interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Shared centered card shell for register/login/verify/forgot/reset pages. */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="mx-auto flex min-h-[70svh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-6 flex justify-center">
        <BrandLogo surface="light" />
      </div>
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-foreground-secondary">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
