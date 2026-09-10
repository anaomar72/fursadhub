import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AnimatedCheck, ButtonLink, Icon } from '../../../components/ui'
import * as universityApi from '../../university/api/universityApi'
import type { StudentEnrollmentResponse } from '../types'

/** The four points of the real enrollment workflow, all of them behind us by the time this renders. */
const COMPLETED_STEPS = ['claim', 'evidence', 'review', 'verified'] as const

/**
 * What the enrollment page becomes once the university has verified the student.
 *
 * <p>It used to stay a submission form with a green tick appended underneath: the same status row,
 * the same details panel, the same shape as the screen that had been asking for a document. Nothing
 * about it said *finished*. This is the finished state — the outcome first, the workflow shown as
 * complete, then the things that are now worth doing instead.
 *
 * <p><strong>Only real data.</strong> The university and department names are resolved from the ids
 * the enrollment actually carries; if either lookup fails the row is simply omitted rather than
 * filled with a placeholder. **No verification date is shown**, because
 * `StudentEnrollmentResponse` does not expose one — inventing "verified today" from the moment the
 * page happened to load would be a fabrication.
 *
 * <p><strong>It claims only what happened.</strong> A verified ENROLLMENT is not a verified
 * institution and not a verified account (CLAUDE.md sections 13 and 27); the copy says the
 * university confirmed this student's enrollment, and stops there.
 *
 * <p>The next actions are existing routes only, and nothing is described as "unlocked" — the
 * student can already browse; what changed is that they can now apply.
 */
export function VerifiedEnrollment({ enrollment }: { enrollment: StudentEnrollmentResponse }) {
  const { t } = useTranslation()

  const university = useQuery({
    queryKey: ['public-university', enrollment.universityId],
    queryFn: () => universityApi.getPublicUniversity(enrollment.universityId),
    retry: false,
    staleTime: 5 * 60_000,
  })

  const departments = useQuery({
    queryKey: ['departments', enrollment.universityId],
    queryFn: () => universityApi.listDepartments(enrollment.universityId),
    retry: false,
    staleTime: 5 * 60_000,
  })

  const departmentName = departments.data?.find((entry) => entry.id === enrollment.departmentId)?.name

  const facts = [
    { key: 'university', value: university.data?.name },
    { key: 'department', value: departmentName },
    { key: 'program', value: enrollment.program },
    { key: 'academicYear', value: enrollment.academicYear },
    { key: 'studentNumber', value: enrollment.studentNumber },
  ].filter((fact): fact is { key: string; value: string } => Boolean(fact.value))

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-success/30 bg-success-bg/40">
        <div className="flex flex-col items-center px-6 py-9 text-center">
          <AnimatedCheck label={t('student:enrollment.verified.badge')} />
          <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-brand-navy dark:text-foreground">
            {t('student:enrollment.verified.title')}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-foreground-secondary">
            {t('student:enrollment.verified.body')}
          </p>
        </div>

        <dl className="grid gap-px border-t border-success/20 bg-border sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.key} className="bg-surface px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                {t(`student:enrollment.verified.facts.${fact.key}`)}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The real workflow, all four points behind them. Completed steps look completed rather than
          leaving the student wondering whether something is still outstanding. */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h3 className="font-display text-sm font-bold text-brand-navy dark:text-foreground">
          {t('student:enrollment.verified.progressTitle')}
        </h3>
        <ol className="mt-4 space-y-3">
          {COMPLETED_STEPS.map((step) => (
            <li key={step} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white"
              >
                <Icon name="check" className="size-3.5" />
              </span>
              <span className="text-sm leading-6 text-foreground-secondary">
                {t(`student:enrollment.verified.steps.${step}`)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h3 className="font-display text-sm font-bold text-brand-navy dark:text-foreground">
          {t('student:enrollment.verified.nextTitle')}
        </h3>
        <p className="mt-1 text-sm leading-6 text-foreground-secondary">
          {t('student:enrollment.verified.nextBody')}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink to="/student/opportunities">{t('student:enrollment.verified.browse')}</ButtonLink>
          <ButtonLink variant="outline" to="/student/profile">
            {t('student:enrollment.verified.profile')}
          </ButtonLink>
        </div>
      </section>
    </div>
  )
}
