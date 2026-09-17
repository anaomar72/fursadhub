import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'
import { ButtonLink } from './ButtonLink'

export interface AccessDeniedStateProps {
  /** What was refused, in the reader's terms. Defaults to the generic area-level wording. */
  description?: string
  /** Where this person can actually go. Omitted only when there is genuinely nowhere. */
  backTo?: string
  backLabel?: string
}

/**
 * The permission-denied surface.
 *
 * <p>Reaching a route you may not open is a legitimate state, not an error — a link from a
 * colleague, a bookmark kept after a role change, a typed URL — and it deserves the same care as
 * any other. It previously rendered as one muted sentence floating in an otherwise empty page, with
 * no heading, no explanation of what to do next, and no way back.
 *
 * <p>Three things this fixes, beyond the visual:
 *
 * <ul>
 *   <li><strong>It has an {@code h1}.</strong> Every other page in the product does. Without one,
 *       a screen-reader user who lands here by following a link gets a page with no title to orient
 *       from, and heading navigation skips straight past the only content on it.</li>
 *   <li><strong>It offers a route out.</strong> A dead end is the one thing a denial must not be.</li>
 *   <li><strong>It says nothing about what exists.</strong> The copy explains the reader's own
 *       access, never whether the resource behind the URL is real — so this surface cannot become a
 *       way to probe for records, which is the whole point of the scoped-404 convention behind it.</li>
 * </ul>
 *
 * <p>Authorization itself is unaffected and lives where it always did: the backend re-authorizes
 * every request from current PostgreSQL data, and this component is only what the refusal looks
 * like.
 */
export function AccessDeniedState({ description, backTo, backLabel }: AccessDeniedStateProps) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center sm:py-24">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-muted text-foreground-secondary">
        <Icon name="lock" className="size-6" />
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-xl font-extrabold tracking-tight text-brand-navy dark:text-foreground">
          {t('common:accessDenied.title')}
        </h1>
        <p className="text-sm leading-6 text-foreground-secondary">
          {description ?? t('common:accessDenied.description')}
        </p>
      </div>
      {backTo && (
        <ButtonLink to={backTo} variant="outline" className="mt-2">
          {backLabel ?? t('common:accessDenied.back')}
        </ButtonLink>
      )}
    </div>
  )
}
