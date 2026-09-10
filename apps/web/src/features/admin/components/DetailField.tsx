import type { ReactNode } from 'react'

/**
 * One label/value pair inside an admin detail card's `<dl>`.
 *
 * <p>A real `<dt>`/`<dd>` rather than two divs: the admin console is mostly record inspection, and
 * a definition list is what a screen reader needs to announce "Registration number: 12345" instead
 * of two unrelated fragments of text.
 */
export function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">{children}</dd>
    </div>
  )
}
