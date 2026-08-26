import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../../../components/ui'
import type { CompletionRequirementResponse, CompletionStatusResponse } from '../types'

interface CompletionChecklistProps {
  status: CompletionStatusResponse
  /** Optional trailing content, e.g. the university's complete-internship action. */
  children?: React.ReactNode
}

/**
 * The internship completion checklist, shared by the student, university and organization areas so
 * every party reads the same list in the same shape (Phase 6 section 33).
 *
 * <p>Everything here comes from the backend. The frontend never decides what an internship requires
 * — it renders `status.requirements` — so the checklist and the rules the completion command
 * enforces cannot drift apart.
 *
 * <p>Requirements this placement's policy does not ask for are FILTERED OUT rather than drawn as
 * unmet. Showing a disabled requirement as missing would tell a student they owe work nobody asked
 * for.
 *
 * <p>State is never conveyed by colour alone (BRAND_AND_UI_GUIDELINES.md section 9): every row pairs
 * a tone with a glyph and translated text, and each item carries an accessible label naming both the
 * requirement and its state.
 */
export function CompletionChecklist({ status, children }: CompletionChecklistProps) {
  const { t } = useTranslation()

  const applicable = status.requirements.filter((requirement) => requirement.required)

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t('internship:completion.title')}</h2>
        <StatusBadge tone={status.canComplete ? 'success' : 'warning'}>
          {status.canComplete
            ? t('internship:completion.readyBadge')
            : t('internship:completion.outstandingBadge', { count: applicable.filter((r) => !r.satisfied).length })}
        </StatusBadge>
      </div>

      {applicable.length === 0 ? (
        <p className="mt-3 text-sm text-foreground-secondary">{t('internship:completion.noRequirements')}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {applicable.map((requirement) => (
            <RequirementRow key={requirement.type} requirement={requirement} />
          ))}
        </ul>
      )}

      {children && <div className="mt-4 border-t border-border pt-4">{children}</div>}
    </section>
  )
}

function RequirementRow({ requirement }: { requirement: CompletionRequirementResponse }) {
  const { t } = useTranslation()

  const label = t(`internship:completion.requirements.${requirement.type}`)
  const stateLabel = requirement.satisfied
    ? t('internship:completion.satisfied')
    : t('internship:completion.outstanding')

  return (
    <li className="flex items-start gap-2.5 text-sm">
      {/*
        The glyph carries the same information as the colour, so the row still reads correctly in
        monochrome or to anyone who cannot distinguish the tones.
      */}
      <span
        aria-hidden="true"
        className={requirement.satisfied ? 'text-success' : 'text-foreground-secondary'}
      >
        {requirement.satisfied ? '✓' : '○'}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2 text-foreground">
        <span aria-label={`${label}: ${stateLabel}`}>{label}</span>
        {requirement.detail && (
          <span className="text-xs text-foreground-secondary">
            {t(`internship:completion.detail.${requirement.detail}`, { defaultValue: requirement.detail })}
          </span>
        )}
      </span>
    </li>
  )
}
