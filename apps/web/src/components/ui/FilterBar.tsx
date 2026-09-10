import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'
export interface FilterBarProps extends HTMLAttributes<HTMLDivElement> { search?: ReactNode; actions?: ReactNode }
export function FilterBar({ search, actions, children, className, ...props }: FilterBarProps) { return <div className={cn('flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center', className)} {...props}>{search && <div className="min-w-0 flex-1 sm:min-w-64">{search}</div>}<div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>{actions && <div className="flex items-center gap-2 sm:ml-auto">{actions}</div>}</div> }
