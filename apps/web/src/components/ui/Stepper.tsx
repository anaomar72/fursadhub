import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'

export interface StepItem {
  label: string
  description?: string
}

export interface StepperProps {
  steps: StepItem[]
  /** Index of the step in progress. Steps before it are complete; `steps.length` means all done. */
  currentStep: number
  label?: string
  /**
   * `vertical` (default) stacks the steps with a connecting rule — it fits any width and any label
   * length. `horizontal` lays them out in a row from `lg` up and stacks below that, so five Somali
   * step names never have to share a phone's width.
   */
  orientation?: 'vertical' | 'horizontal'
  /** The in-progress step needs attention (e.g. changes requested): a warning marker instead of the number. */
  attention?: boolean
  className?: string
}

/**
 * Progress through a REAL multi-stage workflow — onboarding, verification. Not for arbitrary field
 * grouping: each step must be a stage the person actually moves through.
 *
 * <p>State is carried three ways, never by colour alone: a check icon for done steps, the step
 * number (or an alert mark) for the current one, `aria-current="step"`, and a visually hidden
 * "completed"/"current" word for screen readers.
 */
export function Stepper({ steps, currentStep, label, orientation = 'vertical', attention = false, className }: StepperProps) {
  const { t } = useTranslation()
  const horizontal = orientation === 'horizontal'
  return (
    <ol
      aria-label={label ?? t('common:a11y.progress')}
      className={cn('grid gap-0', horizontal && 'lg:grid-flow-col lg:auto-cols-fr lg:gap-4', className)}
    >
      {steps.map((step, i) => {
        const done = i < currentStep
        const active = i === currentStep
        const last = i === steps.length - 1
        return (
          <li key={step.label} aria-current={active ? 'step' : undefined} className={cn('relative flex min-w-0 gap-3', !last && 'pb-5', horizontal && 'lg:pb-0')}>
            {/* The connecting rule: vertical between markers; hidden in the horizontal row. */}
            {!last && (
              <span
                aria-hidden="true"
                className={cn('absolute start-3.5 top-8 bottom-1 w-px', done ? 'bg-success' : 'bg-border', horizontal && 'lg:hidden')}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-bold',
                done && 'border-success bg-success text-on-action',
                active && !attention && 'border-action-primary bg-action-primary text-on-action',
                active && attention && 'border-warning bg-warning-bg text-warning',
                !done && !active && 'border-border-strong bg-surface text-muted',
              )}
            >
              {done ? <Icon name="check" className="size-3.5" /> : active && attention ? <Icon name="alert" className="size-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn('break-words text-body font-semibold', active ? 'text-foreground' : done ? 'text-foreground' : 'text-foreground-secondary')}>
                {step.label}
                <span className="sr-only">
                  {' '}
                  ({done ? t('common:a11y.stepCompleted') : active ? t('common:a11y.stepCurrent') : t('common:a11y.stepUpcoming')})
                </span>
              </p>
              {step.description && <p className="mt-0.5 break-words text-caption text-foreground-secondary">{step.description}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
