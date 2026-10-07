import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export interface FormSectionProps {
  title: string
  /** One or two sentences on what this group of fields is for. */
  description?: string
  children: ReactNode
  /**
   * `aside` (default) puts the title and description in a column BESIDE the fields from `lg` up —
   * the layout for long settings/profile forms, where the reader scans the left column to find a
   * group. `stacked` keeps the title above the fields at every width, for a short form or one that
   * lives in a narrow column (a dialog, a 768px form page).
   */
  layout?: 'aside' | 'stacked'
  className?: string
}

/**
 * One titled group of fields.
 *
 * <p>Long forms (organization and university profiles, the opportunity editor) were a single run of
 * fields with nothing to tell one group from the next. This gives each group a heading, an optional
 * explanation and a consistent 16px field rhythm, and separates consecutive groups with a rule and
 * 32px of space — so no group needs its own bordered card.
 *
 * <p>Stack sections directly; the rule between them comes from this component:
 *
 * <pre>
 * &lt;form&gt;
 *   &lt;FormSection title="Organization details"&gt;…fields…&lt;/FormSection&gt;
 *   &lt;FormSection title="Contact"&gt;…fields…&lt;/FormSection&gt;
 * &lt;/form&gt;
 * </pre>
 *
 * <p>It is a `<fieldset>` with its title as the `<legend>`, so a screen reader announces the group
 * name when focus enters any field inside it. Below `lg` everything is one column.
 */
export function FormSection({ title, description, children, layout = 'aside', className }: FormSectionProps) {
  const descriptionId = useId()
  const aside = layout === 'aside'
  return (
    <fieldset
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'min-w-0 border-0 p-0',
        // The rule and the 32px section gap belong to every section after the first.
        '[&+&]:mt-8 [&+&]:border-t [&+&]:border-border [&+&]:pt-8',
        aside && 'lg:grid lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-x-10',
        className,
      )}
    >
      {/*
        A <legend> cannot be a grid item in every browser, so the visible heading sits in a div and
        the legend carries the accessible name only.
      */}
      <legend className="sr-only">{title}</legend>
      <div className={cn('min-w-0', aside ? 'mb-4 lg:mb-0' : 'mb-4')}>
        {/* Hidden from assistive technology only because the legend already announces it. */}
        <p aria-hidden="true" className="break-words font-display text-title-panel text-foreground">
          {title}
        </p>
        {description && (
          <p id={descriptionId} className="mt-1 text-body text-foreground-secondary">
            {description}
          </p>
        )}
      </div>
      <div className="grid min-w-0 gap-4">{children}</div>
    </fieldset>
  )
}
