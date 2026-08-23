import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as opportunityApi from '../api/opportunityApi'
import * as universityApi from '../../university/api/universityApi'
import { opportunityFormSchema, type OpportunityFormValues } from '../schemas/opportunityFormSchema'
import { targetFormSchema, type TargetFormValues } from '../schemas/targetFormSchema'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, FormField, Input, LoadingSpinner, Select, StatusBadge } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { OpportunityFormFields } from '../components/OpportunityFormFields'
import type { OpportunityStatus } from '../types'

const STATUS_TONE: Record<OpportunityStatus, StatusTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  PAUSED: 'warning',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
}

export function OpportunityDetailPage() {
  const { t } = useTranslation()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const { role } = useOrganizationMembership()
  const canManage = role === 'ORGANIZATION_ADMIN' || role === 'RECRUITER'
  const queryClient = useQueryClient()

  const opportunityQuery = useQuery({
    queryKey: ['opportunities', 'detail', opportunityId],
    queryFn: () => opportunityApi.getOpportunity(opportunityId!),
    enabled: !!opportunityId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['opportunities', 'detail', opportunityId] })

  const form = useForm<OpportunityFormValues>({ resolver: zodResolver(opportunityFormSchema) })

  useEffect(() => {
    if (opportunityQuery.data) {
      form.reset({
        title: opportunityQuery.data.title,
        description: opportunityQuery.data.description,
        responsibilities: opportunityQuery.data.responsibilities ?? '',
        requirements: opportunityQuery.data.requirements ?? '',
        mode: opportunityQuery.data.mode,
        numberOfOpenings: opportunityQuery.data.numberOfOpenings,
        workMode: opportunityQuery.data.workMode,
        location: opportunityQuery.data.location ?? '',
        startDate: opportunityQuery.data.startDate,
        endDate: opportunityQuery.data.endDate,
        applicationDeadline: opportunityQuery.data.applicationDeadline ?? '',
      })
    }
  }, [opportunityQuery.data, form])

  const updateMutation = useMutation({
    mutationFn: (values: OpportunityFormValues) => opportunityApi.updateOpportunity(opportunityId!, values),
    onSuccess: invalidate,
  })
  const publishMutation = useMutation({ mutationFn: () => opportunityApi.publishOpportunity(opportunityId!), onSuccess: invalidate })
  const pauseMutation = useMutation({ mutationFn: () => opportunityApi.pauseOpportunity(opportunityId!), onSuccess: invalidate })
  const resumeMutation = useMutation({ mutationFn: () => opportunityApi.resumeOpportunity(opportunityId!), onSuccess: invalidate })
  const closeMutation = useMutation({ mutationFn: () => opportunityApi.closeOpportunity(opportunityId!), onSuccess: invalidate })
  const cancelMutation = useMutation({ mutationFn: () => opportunityApi.cancelOpportunity(opportunityId!), onSuccess: invalidate })

  const transitionError =
    publishMutation.error ?? pauseMutation.error ?? resumeMutation.error ?? closeMutation.error ?? cancelMutation.error ?? null
  const anyTransitionPending =
    publishMutation.isPending || pauseMutation.isPending || resumeMutation.isPending || closeMutation.isPending || cancelMutation.isPending

  if (opportunityQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const opportunity = opportunityQuery.data
  if (!opportunity) {
    return null
  }

  const isDraft = opportunity.status === 'DRAFT'
  const supportsTargeting = opportunity.mode === 'UNIVERSITY_TARGETED' || opportunity.mode === 'HYBRID'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">{opportunity.title}</h1>
        <StatusBadge tone={STATUS_TONE[opportunity.status]}>{t(`opportunities:statusValues.${opportunity.status}`)}</StatusBadge>
      </div>

      {canManage && isDraft && (
        <form
          className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
          noValidate
          onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
        >
          <OpportunityFormFields form={form} />

          {updateMutation.isError && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'opportunities', 'form', updateMutation.error)}
            </p>
          )}

          <Button type="submit" loading={updateMutation.isPending} className="w-full sm:w-auto">
            {t('opportunities:form.saveChanges')}
          </Button>
        </form>
      )}

      {!isDraft && (
        <dl className="mt-6 grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-4 text-sm">
          <Row label={t('opportunities:form.modeLabel')} value={t(`opportunities:modeValues.${opportunity.mode}`)} />
          <Row label={t('opportunities:form.openingsLabel')} value={String(opportunity.numberOfOpenings)} />
          <Row label={t('opportunities:form.workModeLabel')} value={t(`opportunities:workModeValues.${opportunity.workMode}`)} />
          <Row label={t('opportunities:form.startDateLabel')} value={opportunity.startDate} />
          <Row label={t('opportunities:form.endDateLabel')} value={opportunity.endDate} />
        </dl>
      )}

      {canManage && isDraft && supportsTargeting && <TargetingSection opportunityId={opportunity.id} startDate={opportunity.startDate} />}

      {canManage && (
        <div className="mt-6 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <Button loading={publishMutation.isPending} disabled={anyTransitionPending} onClick={() => publishMutation.mutate()}>
                {t('opportunities:actions.publish')}
              </Button>
            )}
            {opportunity.status === 'PUBLISHED' && (
              <>
                <Button
                  variant="outline"
                  loading={pauseMutation.isPending}
                  disabled={anyTransitionPending}
                  onClick={() => pauseMutation.mutate()}
                >
                  {t('opportunities:actions.pause')}
                </Button>
                <Button
                  variant="outline"
                  loading={closeMutation.isPending}
                  disabled={anyTransitionPending}
                  onClick={() => closeMutation.mutate()}
                >
                  {t('opportunities:actions.close')}
                </Button>
              </>
            )}
            {opportunity.status === 'PAUSED' && (
              <>
                <Button loading={resumeMutation.isPending} disabled={anyTransitionPending} onClick={() => resumeMutation.mutate()}>
                  {t('opportunities:actions.resume')}
                </Button>
                <Button
                  variant="outline"
                  loading={closeMutation.isPending}
                  disabled={anyTransitionPending}
                  onClick={() => closeMutation.mutate()}
                >
                  {t('opportunities:actions.close')}
                </Button>
              </>
            )}
            {(opportunity.status === 'DRAFT' || opportunity.status === 'PUBLISHED' || opportunity.status === 'PAUSED') && (
              <Button
                variant="danger"
                loading={cancelMutation.isPending}
                disabled={anyTransitionPending}
                onClick={() => cancelMutation.mutate()}
              >
                {t('opportunities:actions.cancel')}
              </Button>
            )}
          </div>
          {transitionError && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'opportunities', 'actions', transitionError)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-foreground-secondary">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}

/** Only rendered while the opportunity is DRAFT and its mode supports targeting (CLAUDE.md section 9/10). */
function TargetingSection({ opportunityId, startDate }: { opportunityId: string; startDate: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const targetsQuery = useQuery({ queryKey: ['opportunities', 'targets', opportunityId], queryFn: () => opportunityApi.listTargets(opportunityId) })
  const universitiesQuery = useQuery({ queryKey: ['universities'], queryFn: universityApi.listUniversities })
  const verifiedUniversities = universitiesQuery.data?.filter((u) => u.status === 'VERIFIED') ?? []

  const form = useForm<TargetFormValues>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: { universityId: '', departmentIds: [], requestedNominees: 1, nominationDeadline: '' },
  })
  const selectedUniversityId = form.watch('universityId')
  const departmentsQuery = useQuery({
    queryKey: ['departments', selectedUniversityId],
    queryFn: () => universityApi.listDepartments(selectedUniversityId),
    enabled: !!selectedUniversityId,
  })

  const invalidateTargets = () => queryClient.invalidateQueries({ queryKey: ['opportunities', 'targets', opportunityId] })

  const addMutation = useMutation({
    mutationFn: (values: TargetFormValues) => opportunityApi.addTarget(opportunityId, values),
    onSuccess: () => {
      form.reset({ universityId: '', departmentIds: [], requestedNominees: 1, nominationDeadline: '' })
      invalidateTargets()
    },
  })

  const removeMutation = useMutation({
    mutationFn: (targetId: string) => opportunityApi.removeTarget(opportunityId, targetId),
    onSuccess: invalidateTargets,
  })

  return (
    <div className="mt-6 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">{t('opportunities:targets.title')}</h2>

      <ul className="mt-3 divide-y divide-border">
        {targetsQuery.data?.map((target) => (
          <li key={target.id} className="flex items-center justify-between gap-3 py-2">
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {universitiesQuery.data?.find((u) => u.id === target.universityId)?.name ?? target.universityId}
              </p>
              <p className="text-xs text-foreground-secondary">
                {t('opportunities:targets.summary', { count: target.requestedNominees, deadline: target.nominationDeadline })}
              </p>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-danger hover:underline"
              onClick={() => removeMutation.mutate(target.id)}
            >
              {t('opportunities:targets.remove')}
            </button>
          </li>
        ))}
        {targetsQuery.data?.length === 0 && (
          <li className="py-3 text-center text-sm text-foreground-secondary">{t('opportunities:targets.empty')}</li>
        )}
      </ul>

      <form
        className="mt-4 flex flex-col gap-3 border-t border-border pt-4"
        noValidate
        onSubmit={form.handleSubmit((values) => addMutation.mutate(values))}
      >
        <FormField label={t('opportunities:targets.universityLabel')} htmlFor="target-university">
          <Select id="target-university" {...form.register('universityId')}>
            <option value="">{t('opportunities:targets.selectUniversity')}</option>
            {verifiedUniversities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </FormField>

        {selectedUniversityId && (
          <FormField label={t('opportunities:targets.departmentsLabel')} htmlFor="target-departments">
            <select
              id="target-departments"
              multiple
              className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              {...form.register('departmentIds')}
            >
              {departmentsQuery.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t('opportunities:targets.nomineesLabel')} htmlFor="target-nominees">
            <Input id="target-nominees" type="number" min={1} {...form.register('requestedNominees', { valueAsNumber: true })} />
          </FormField>
          <FormField label={t('opportunities:targets.deadlineLabel')} htmlFor="target-deadline">
            <Input id="target-deadline" type="date" max={startDate} {...form.register('nominationDeadline')} />
          </FormField>
        </div>

        {addMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'opportunities', 'targets', addMutation.error)}
          </p>
        )}

        <Button type="submit" variant="outline" loading={addMutation.isPending} className="w-full sm:w-auto">
          {t('opportunities:targets.addSubmit')}
        </Button>
      </form>
    </div>
  )
}
