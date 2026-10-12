import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { cn } from '../../lib/utils/cn'

export interface RadioCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'title'> {
  /** Base for the title/description ids the radio is named and described by. */
  idBase: string
  title: ReactNode
  description?: ReactNode
  icon?: IconName
  /** Whether this card is the chosen one — drives the visible mark, never colour alone. */
  selected: boolean
}

/**
 * One choice in a group of explained options (Phase 9 extraction): a real radio input, visually
 * hidden, inside a card the whole of which is its label. The radio is named by the title only and
 * described by the explanation, the visible mark fills when chosen, and the card shows the shared
 * focus ring while the radio inside it has focus.
 *
 * <p>Works controlled (`checked` + `onChange`) or registered with React Hook Form (spread
 * `register(...)` — the ref is forwarded); `selected` is always passed so the visual state follows
 * the form value either way. Wrap a group in a `<fieldset>` with a `<legend>`.
 */
export const RadioCard = forwardRef<HTMLInputElement, RadioCardProps>(
  ({ idBase, title, description, icon, selected, className, ...input }, ref) => (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors duration-150 motion-reduce:transition-none',
        'focus-within:ring-2 focus-within:ring-focus-ring',
        selected ? 'border-action-primary bg-brand-accent-soft' : 'border-border-strong bg-surface hover:bg-control-hover',
        className,
      )}
    >
      <input
        ref={ref}
        type="radio"
        className="sr-only"
        aria-labelledby={`${idBase}-label`}
        aria-describedby={description ? `${idBase}-hint` : undefined}
        {...input}
      />
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-action-primary' : 'border-border-strong',
        )}
      >
        {selected && <span className="size-2.5 rounded-full bg-action-primary" />}
      </span>
      <span className="min-w-0 flex-1">
        <span id={`${idBase}-label`} className="flex items-center gap-2 text-body font-semibold text-foreground">
          {icon && <Icon name={icon} className="size-4 shrink-0 text-foreground-secondary" />}
          {title}
        </span>
        {description && (
          <span id={`${idBase}-hint`} className="mt-1 block text-caption text-foreground-secondary">
            {description}
          </span>
        )}
      </span>
    </label>
  ),
)

RadioCard.displayName = 'RadioCard'
