import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * The type roles defined in index.css (`@theme` `--text-*`). tailwind-merge only knows Tailwind's
 * built-in sizes, so without this it reads `text-title-page` as a COLOUR utility and silently drops
 * it whenever a `text-foreground` follows in the same `cn()` call — the heading would lose its size
 * with no error anywhere.
 */
const TYPE_ROLES = [
  'display-xl',
  'display-lg',
  'title-page',
  'title-section',
  'title-panel',
  'body-lg',
  'body',
  'label',
  'caption',
  'metric',
]

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: TYPE_ROLES }],
    },
  },
})

/** Merges conditional class names and resolves conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
