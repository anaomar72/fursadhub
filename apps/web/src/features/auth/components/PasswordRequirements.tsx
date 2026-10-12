import { useTranslation } from 'react-i18next'
import { Icon } from '../../../components/ui'
import { cn } from '../../../lib/utils/cn'
import { PASSWORD_RULES, type PasswordRule } from '../../../lib/validation/common'

const RULES: PasswordRule[] = ['length', 'letter', 'number']

/**
 * The password policy, shown BEFORE the first submit and ticked off as the person types.
 *
 * <p>Exactly the server's rules (see `PASSWORD_RULES`) and nothing more — no invented "strength"
 * meter, because FursadHub computes no strength score; a bar that filled up would be a claim with
 * nothing behind it.
 *
 * <p>Quiet by design: a met rule turns green with a check; an unmet one stays neutral (never red
 * while someone is still typing). Each rule carries its state in words for screen readers. The
 * field's own hint already states the policy in one sentence (and is its `aria-describedby`), so
 * this list is not announced on every keystroke — it is there to be read, not to talk.
 */
export function PasswordRequirements({ value, id }: { value: string; id: string }) {
  const { t } = useTranslation()
  return (
    <div id={id} className="rounded-lg bg-surface-muted px-3.5 py-3">
      <p className="sr-only">{t('auth:register.passwordRules.title')}</p>
      <ul className="grid gap-1.5 sm:grid-cols-3 sm:gap-3">
        {RULES.map((rule) => {
          const met = PASSWORD_RULES[rule](value)
          return (
            <li key={rule} className={cn('flex min-w-0 items-center gap-1.5 text-caption', met ? 'text-success' : 'text-foreground-secondary')}>
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 motion-reduce:transition-none',
                  met ? 'border-success bg-success text-on-action' : 'border-border-strong',
                )}
              >
                {met && <Icon name="check" className="size-2.5" />}
              </span>
              <span className="min-w-0 break-words">
                {t(`auth:register.passwordRules.${rule}`)}
                <span className="sr-only"> — {met ? t('auth:register.passwordRules.met') : t('auth:register.passwordRules.notMet')}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
