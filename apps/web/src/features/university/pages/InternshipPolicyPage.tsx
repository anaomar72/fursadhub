import { useContext, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, LoadingSpinner, Select, StatusBadge } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as placementsApi from '../../placements/api/placementsApi'
import type { InternshipPolicyInput } from '../../placements/types'
import { UniversityMembershipContext } from '../components/UniversityMembershipContext'
import * as universityApi from '../api/universityApi'

/**
 * The five — and only five — completion requirements (CLAUDE.md section 41). This is a closed list
 * written out in code, not a form generated from a schema, because FursadHub deliberately has no
 * dynamic requirement builder: adding a sixth would take a migration and a code review.
 */
const REQUIREMENT_KEYS = [
  'weeklyLogsRequired',
  'attendanceRequired',
  'organizationEvaluationRequired',
  'finalReportRequired',
  'defenseRequired',
] as const

const UNIVERSITY_LEVEL = ''

/**
 * Internship policy configuration for a university and its departments.
 *
 * <p>Two levels only. A department with no override of its own shows the university's values
 * labelled {@code UNIVERSITY}, so staff always see what their students are actually held to rather
 * than an empty form — and removing an override is a distinct action from setting everything to
 * false, because those mean different things.
 *
 * <p>Editing a policy never rewrites history: existing placements froze their requirements the first
 * time internship activity touched them, which the page says out loud so nobody expects otherwise.
 */
export function InternshipPolicyPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const membership = useContext(UniversityMembershipContext)
  const [departmentId, setDepartmentId] = useState<string>(UNIVERSITY_LEVEL)
  const [draft, setDraft] = useState<InternshipPolicyInput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const universityId = membership?.universityId
  const isAdmin = membership?.role === 'UNIVERSITY_ADMIN'

  const departmentsQuery = useQuery({
    queryKey: ['departments', universityId],
    queryFn: () => universityApi.listDepartments(universityId!),
    enabled: !!universityId,
  })

  const policyQuery = useQuery({
    queryKey: ['internship-policy', universityId, departmentId],
    queryFn: () =>
      departmentId === UNIVERSITY_LEVEL
        ? placementsApi.getUniversityInternshipPolicy(universityId!)
        : placementsApi.getDepartmentInternshipPolicy(universityId!, departmentId),
    enabled: !!universityId,
  })

  /*
   * Seeds the form from whichever level is selected. Keyed on the level and the resolved source, so
   * switching between the university default and a department override reloads the right values —
   * and saving does not clobber what the admin just typed, because the effect only fires when the
   * identity of the policy being edited changes.
   */
  const policySignature = `${departmentId}:${policyQuery.data?.source ?? ''}`
  useEffect(() => {
    if (policyQuery.data) {
      const { source: _source, ...values } = policyQuery.data
      setDraft(values)
      setSaved(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policySignature])

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['internship-policy', universityId] })
  }

  function run<T>(promise: Promise<T>) {
    setError(null)
    return promise.catch((cause) => {
      setError(apiErrorMessage(t, 'internship', 'policy', cause))
      throw cause
    })
  }

  const saveMutation = useMutation({
    mutationFn: (policy: InternshipPolicyInput) =>
      run(
        departmentId === UNIVERSITY_LEVEL
          ? placementsApi.setUniversityInternshipPolicy(universityId!, policy)
          : placementsApi.setDepartmentInternshipPolicy(universityId!, departmentId, policy),
      ),
    onSuccess: () => {
      setSaved(true)
      invalidate()
    },
  })

  const clearMutation = useMutation({
    mutationFn: () => run(placementsApi.clearDepartmentInternshipPolicy(universityId!, departmentId)),
    onSuccess: invalidate,
  })

  if (!universityId) {
    return (
      <p className="px-4 py-10 text-center text-sm text-foreground-secondary">
        {t('internship:policy.noMembership')}
      </p>
    )
  }

  if (policyQuery.isLoading || !draft) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const source = policyQuery.data?.source ?? 'PLATFORM_DEFAULT'
  const editable = departmentId === UNIVERSITY_LEVEL ? isAdmin : true

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('internship:policy.title')}</h1>
        <p className="mt-1 text-sm text-foreground-secondary">{t('internship:policy.description')}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="policy-level" className="text-sm font-medium text-foreground">
          {t('internship:policy.level')}
        </label>
        <Select
          id="policy-level"
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <option value={UNIVERSITY_LEVEL}>{t('internship:policy.universityLevel')}</option>
          {(departmentsQuery.data ?? []).map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t('internship:policy.requirements')}</h2>
          <StatusBadge tone={source === 'PLATFORM_DEFAULT' ? 'neutral' : 'info'}>
            {t(`internship:policy.sourceValues.${source}`)}
          </StatusBadge>
        </div>

        <fieldset className="mt-4 flex flex-col gap-3" disabled={!editable}>
          <legend className="sr-only">{t('internship:policy.requirements')}</legend>
          {REQUIREMENT_KEYS.map((key) => (
            <label key={key} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-border accent-brand-primary"
                checked={draft[key]}
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, [key]: event.target.checked } : current))
                }
              />
              <span>
                <span className="font-medium text-foreground">
                  {t(`internship:policy.fields.${key}.label`)}
                </span>
                <span className="block text-xs text-foreground-secondary">
                  {t(`internship:policy.fields.${key}.hint`)}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-xs text-foreground-secondary">
          {t('internship:policy.historicalNote')}
        </p>

        {error && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="mt-3 text-sm text-success" role="status">
            {t('internship:policy.saved')}
          </p>
        )}

        {editable && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate(draft)}>
              {t('internship:policy.actions.save')}
            </Button>
            {departmentId !== UNIVERSITY_LEVEL && source === 'DEPARTMENT' && (
              <Button
                variant="outline"
                loading={clearMutation.isPending}
                onClick={() => clearMutation.mutate()}
              >
                {t('internship:policy.actions.clearOverride')}
              </Button>
            )}
          </div>
        )}

        {!editable && (
          <p className="mt-4 text-sm text-foreground-secondary">{t('internship:policy.readOnly')}</p>
        )}
      </div>
    </div>
  )
}
