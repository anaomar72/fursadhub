import type { ClassValue } from 'clsx'
import { cn } from '../../lib/utils/cn'


export function controlClasses(invalid: boolean | undefined, ...extra: ClassValue[]) {
  return cn(
    'fh-control min-w-0 w-full rounded-control border bg-surface text-body text-foreground placeholder:text-muted',
    'transition-[border-color,box-shadow] duration-fast ease-ui motion-reduce:transition-none',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    'disabled:cursor-not-allowed disabled:bg-control-disabled disabled:text-foreground-secondary',
    invalid ? 'border-danger' : 'border-border-strong hover:border-foreground-secondary',
    ...extra,
  )
}


export const CONTROL_HEIGHT = 'h-10'
