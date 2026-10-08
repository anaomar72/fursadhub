import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'

/**
 * `complete` done · `current` in progress · `attention` someone (usually the reader) must act ·
 * `upcoming` not started · `notReached` the journey ended before this step.
 */
export type LifecycleState = 'complete' | 'current' | 'attention' | 'upcoming' | 'notReached'

export interface LifecycleTrackerStep {
  id: string
  label: string
  state: LifecycleState
  /** One short line under the label: a date, "3 of 12 reviewed", "Needs revision". */
  description?: ReactNode
  /** Optional link target for the step's own page. */
  action?: ReactNode
  /**
   * Steps sharing a group key are drawn as one unordered block under `groups[key]` — for stages
   * the workflow does not sequence (e.g. internship requirements that may be done in any order).
   */
  group?: string
}

export interface LifecycleTrackerProps {
  steps: LifecycleTrackerStep[]
  /** Accessible name for the whole tracker. */
  label: string
  /** Visible heading for each group key, e.g. `{ requirements: 'Requirements — in any order' }`. */
  groups?: Record<string, string>
  className?: string
}

const MARKER: Record<LifecycleState, string> = {
  complete: 'border-success bg-success text-on-action',
  current: 'border-action-primary bg-surface text-action-primary',
  attention: 'border-warning bg-warning-bg text-warning',
  upcoming: 'border-border-strong bg-surface text-muted',
  notReached: 'border-dashed border-border-strong bg-surface-muted text-muted',
}

/**
 * A journey through a REAL multi-stage workflow (CLAUDE.md sections 2, 39-46): what is done, what is
 * in progress, what needs action, and what is still ahead.
 *
 * <p>Unlike `Stepper`, which is a strict sequence with one current index, every step here carries
 * its own state — an internship can have its weekly logs in progress while the final report already
 * needs revision — and unordered stages are grouped instead of numbered, so the tracker never
 * implies an order the backend does not enforce.
 *
 * <p>State is never colour alone: each marker has a distinct glyph (check, dot, alert, empty,
 * dash) and every step carries its state as a word for assistive technology. It is not
 * interactive and takes no focus; the optional `action` per step is an ordinary link.
 */
export function LifecycleTracker({ steps, label, groups = {}, className }: LifecycleTrackerProps) {
  const { t } = useTranslation()

  // Consecutive steps of the same group become one block, keeping the overall order.
  const blocks: { group?: string; steps: LifecycleTrackerStep[] }[] = []
  for (const step of steps) {
    const last = blocks[blocks.length - 1]
    if (step.group && last?.group === step.group) last.steps.push(step)
    else blocks.push({ group: step.group, steps: [step] })
  }

  return (
    <ol aria-label={label} className={cn('flex flex-col', className)}>
      {blocks.map((block, blockIndex) => {
        const lastBlock = blockIndex === blocks.length - 1
        if (!block.group) {
          const step = block.steps[0]
          return <StepRow key={step.id} step={step} connector={!lastBlock} t={t} />
        }
        return (
          <li key={`group-${block.group}-${blockIndex}`} className={cn('relative ps-10', !lastBlock && 'pb-4')}>
            {/* The spine continues past the group, which hangs off it as an unnumbered set. */}
            <span aria-hidden="true" className="absolute start-3.5 top-0 bottom-0 w-px bg-border" />
            <p className="text-caption font-semibold uppercase tracking-wide text-foreground-secondary">
              {groups[block.group] ?? block.group}
            </p>
            <ul className="mt-2 flex flex-col gap-2 rounded-lg bg-surface-muted p-3">
              {block.steps.map((step) => (
                <StepRow key={step.id} step={step} connector={false} compact t={t} />
              ))}
            </ul>
          </li>
        )
      })}
    </ol>
  )
}

function StepRow({
  step,
  connector,
  compact = false,
  t,
}: {
  step: LifecycleTrackerStep
  connector: boolean
  compact?: boolean
  t: (key: string) => string
}) {
  return (
    <li className={cn('relative flex min-w-0 gap-3', connector && 'pb-4')}>
      {connector && (
        <span
          aria-hidden="true"
          className={cn('absolute start-3.5 top-8 bottom-0 w-px', step.state === 'complete' ? 'bg-success' : 'bg-border')}
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-full border-2',
          compact ? 'size-6' : 'size-7',
          MARKER[step.state],
        )}
      >
        <Marker state={step.state} />
      </span>
      <div className={cn('min-w-0 flex-1', compact ? 'pt-0.5' : 'pt-1')}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p
            className={cn(
              'break-words font-semibold',
              step.state === 'upcoming' || step.state === 'notReached' ? 'text-foreground-secondary' : 'text-foreground',
            )}
          >
            {step.label}
            <span className="sr-only"> ({t(`common:lifecycle.states.${step.state}`)})</span>
          </p>
          {step.action}
        </div>
        {step.description && <p className="mt-0.5 break-words text-caption text-foreground-secondary">{step.description}</p>}
      </div>
    </li>
  )
}

function Marker({ state }: { state: LifecycleState }) {
  if (state === 'complete') return <Icon name="check" className="size-3.5" />
  if (state === 'attention') return <Icon name="alert" className="size-3.5" />
  if (state === 'current') return <span className="size-2.5 rounded-full bg-action-primary" />
  if (state === 'notReached') return <span className="h-0.5 w-2.5 rounded-full bg-current" />
  return null
}
