import type { ClassValue } from 'clsx'
import { cn } from '../../lib/utils/cn'

/**
 * The one definition of a text-entry control's appearance — shared by Input, Select, Textarea,
 * PasswordInput and SearchInput, which previously each carried their own copy of this string and
 * had already drifted (PasswordInput had no disabled cursor, no reduced-motion guard and a
 * different focus offset).
 *
 * <p><strong>The resting border is `border-strong`, not the hairline.</strong> A control's edge is
 * what tells a person where to click; WCAG 1.4.11 asks 3:1 for it. The hairline `--color-border`
 * measures about 1.2:1 against white, so an empty input on a white panel was effectively invisible
 * except for its placeholder. Hairlines are for separating content, not for drawing controls.
 *
 * <p>States: hover strengthens the edge slightly; focus is the shared 2px focus ring; `invalid`
 * swaps the edge to danger (and the caller sets `aria-invalid`); disabled dims and changes the
 * ground so it reads as unavailable without relying on opacity alone.
 */
export function controlClasses(invalid: boolean | undefined, ...extra: ClassValue[]) {
  return cn(
    'w-full rounded-md border bg-surface text-body text-foreground placeholder:text-muted',
    'transition-[border-color,box-shadow] duration-150 ease-in-out motion-reduce:transition-none',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    'disabled:cursor-not-allowed disabled:bg-control-disabled disabled:text-foreground-secondary',
    invalid ? 'border-danger' : 'border-border-strong hover:border-foreground-secondary/60',
    ...extra,
  )
}

/** Single-line control height, read off the references: 40px. */
export const CONTROL_HEIGHT = 'h-10'
