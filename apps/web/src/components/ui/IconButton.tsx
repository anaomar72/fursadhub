import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { label: string; size?: 'sm' | 'md' | 'lg'; loading?: boolean }
const sizes = { sm: 'size-8', md: 'size-10', lg: 'size-12' }
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ label, size='md', loading, disabled, className, children, ...props }, ref) => <button ref={ref} type="button" aria-label={label} aria-busy={loading || undefined} disabled={disabled || loading} className={cn('inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-foreground transition-colors hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none', sizes[size], className)} {...props}>{loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true"/> : children}</button>)
IconButton.displayName = 'IconButton'
