import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as opportunityApi from '../api/opportunityApi'
import { ScreeningQuestionEditor } from '../../recruitment/components/ScreeningQuestionEditor'
import { OpportunityFormFields } from '../components/OpportunityFormFields'
import * as universityApi from '../../university/api/universityApi'
import { opportunityFormSchema, type OpportunityFormValues } from '../schemas/opportunityFormSchema'
import { targetFormSchema, type TargetFormValues } from '../schemas/targetFormSchema'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { organizationCapabilities } from '../../organization/organizationCapabilities'
import { OPPORTUNITY_STATUS_TONE, OPPORTUNITY_TARGET_STATUS_TONE } from '../components/statusTone'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import {
  Alert,
  Badge,
  Breadcrumbs,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'
import type { OpportunityResponse } from '../types'

/**
 * One internship: its record, its lifecycle commands, and — while it is still a draft — its
 * editable form, screening questions and university targets.
 *
 * <p>The draft/live split is the backend's, not a design choice: {@code UpdateOpportunityService}
 * and {@code OpportunityTargetService} only accept changes while the opportunity is DRAFT, so once
 * it is published this page shows the record rather than an edit form that would be refused.
 *
 * <p>Every lifecycle change is its own named command — publish, pause, resume, close, cancel — with
 * no status dropdown anywhere, mirroring the API exactly (CLAUDE.md sections 10/33).
 */
export function OpportunityDetailPage() {
  const { t } = useTranslation()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const membership = useOrganizationMembership()
  const can = organizationCapabilities(membership)
  const queryClient = useQueryClient()

  const opportunityQuery = useQuery({
    queryKey: ['opportunities', 'detail', opportunityId],
    queryFn: () => opportunityApi.getOpportunity(opportunityId!),
    enabled: !!opportunityId,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['opportunities', 'detail', opportunityId] })
    void queryClient.invalidateQueries({ queryKey: ['opportunities', 'organization'] })
  }

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
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  const opportunity = opportunityQuery.data
  if (!opportunity) {
    return (
      <PageContainer>
        <EmptyState title={t('opportunities:detail.notFound')} />
      </PageContainer>
    )
  }

  const isDraft = opportunity.status === 'DRAFT'
  const supportsTargeting = opportunity.mode === 'UNIVERSITY_TARGETED' || opportunity.mode === 'HYBRID'
  const isLive = opportunity.status === 'PUBLISHED' || opportunity.status === 'PAUSED'

  return (
    <PageContainer className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('opportunities:list.title'), to: '/organization/opportunities' },
          { label: opportunity.title },
        ]}
      />

      <PageHeader
        eyebrow={t(`opportunities:modeValues.${opportunity.mode}`)}
        title={opportunity.title}
        description={t('placements:detail.dateRange', {
          start: formatDate(opportunity.startDate),
          end: formatDate(opportunity.endDate),
        })}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={OPPORTUNITY_STATUS_TONE[opportunity.status]}>
              {t(`opportunities:statusValues.${opportunity.status}`)}
            </StatusBadge>
            {can.canManageCandidates && isLive && (
              <ButtonLink variant="outline" size="sm" to={`/organization/opportunities/${opportunity.id}/candidates`}>
                {t('recruitment:nav.candidates')}
              </ButtonLink>
            )}
          </div>
        }
      />

      <OpportunityFacts opportunity={opportunity} />

      {can.canManageOpportunities && (
        <Card padding="lg">
          <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
            {t('opportunities:detail.lifecycleTitle')}
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">{t('opportunities:detail.lifecycleHint')}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {isDraft && (
              <Button loading={publishMutation.isPending} disabled={anyTransitionPending} onClick={() => publishMutation.mutate()}>
                {t('opportunities:actions.publish')}
              </Button>
            )}
            {opportunity.status === 'PUBLISHED' && (
              <>
                <Button variant="outline" loading={pauseMutation.isPending} disabled={anyTransitionPending} onClick={() => pauseMutation.mutate()}>
                  {t('opportunities:actions.pause')}
                </Button>
                <Button variant="outline" loading={closeMutation.isPending} disabled={anyTransitionPending} onClick={() => closeMutation.mutate()}>
                  {t('opportunities:actions.close')}
                </Button>
              </>
            )}
            {opportunity.status === 'PAUSED' && (
              <>
                <Button loading={resumeMutation.isPending} disabled={anyTransitionPending} onClick={() => resumeMutation.mutate()}>
                  {t('opportunities:actions.resume')}
                </Button>
                <Button variant="outline" loading={closeMutation.isPending} disabled={anyTransitionPending} onClick={() => closeMutation.mutate()}>
                  {t('opportunities:actions.close')}
                </Button>
              </>
            )}
            {(isDraft || opportunity.status === 'PUBLISHED' || opportunity.status === 'PAUSED') && (
              <Button
                variant="danger"
                className="sm:ml-auto"
                loading={cancelMutation.isPending}
                disabled={anyTransitionPending}
                onClick={() => cancelMutation.mutate()}
              >
                {t('opportunities:actions.cancel')}
              </Button>
            )}
          </div>

          {transitionError && (
            <Alert tone="danger" className="mt-4">
              {apiErrorMessage(t, 'opportunities', 'actions', transitionError)}
            </Alert>
          )}
        </Card>
      )}

      {can.canManageOpportunities && isDraft && (
        <form noValidate onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
          <Card padding="lg" className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
                {t('opportunities:detail.editTitle')}
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">{t('opportunities:detail.editHint')}</p>
            </div>

            <OpportunityFormFields form={form} />

            {updateMutation.isError && (
              <Alert tone="danger">{apiErrorMessage(t, 'opportunities', 'form', updateMutation.error)}</Alert>
            )}

            <div className="border-t border-border pt-4">
              <Button type="submit" loading={updateMutation.isPending}>
                {t('opportunities:form.saveChanges')}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Screening questions are authored while the opportunity is still a draft, mirroring how the
          backend restricts editing the opportunity itself (CLAUDE.md Phase 4 section 9). */}
      {can.canManageOpportunities && isDraft && (
        <Card padding="lg">
          <ScreeningQuestionEditor opportunityId={opportunity.id} />
        </Card>
      )}

      {/* Targets exist only for the two modes that actually source nominees (CLAUDE.md section 34). */}
      {supportsTargeting && (
        <TargetingSection
          opportunityId={opportunity.id}
          startDate={opportunity.startDate}
          editable={can.canManageOpportunities && isDraft}
        />
      )}
    </PageContainer>
  )
}

function OpportunityFacts({ opportunity }: { opportunity: OpportunityResponse }) {
  const { t } = useTranslation()

  return (
    <Card padding="lg">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label={t('opportunities:form.modeLabel')}>
          <Badge>{t(`opportunities:modeValues.${opportunity.mode}`)}</Badge>
        </Fact>
        <Fact label={t('opportunities:form.workModeLabel')}>
          {t(`opportunities:workModeValues.${opportunity.workMode}`)}
        </Fact>
        <Fact label={t('opportunities:form.openingsLabel')}>{opportunity.numberOfOpenings}</Fact>
        <Fact label={t('opportunities:form.applicationDeadlineLabel')}>
          {opportunity.applicationDeadline ? formatDate(opportunity.applicationDeadline) : '—'}
        </Fact>
        {opportunity.location && (
          <Fact label={t('opportunities:form.locationLabel')}>{opportunity.location}</Fact>
        )}
        {opportunity.publishedAt && (
          <Fact label={t('opportunities:detail.publishedAt')}>{formatDate(opportunity.publishedAt)}</Fact>
        )}
      </dl>

      <div className="mt-6 flex flex-col gap-5 border-t border-border pt-5">
        <Section title={t('opportunities:form.descriptionLabel')} body={opportunity.description} />
        {opportunity.responsibilities && (
          <Section title={t('opportunities:form.responsibilitiesLabel')} body={opportunity.responsibilities} />
        )}
        {opportunity.requirements && (
          <Section title={t('opportunities:form.requirementsLabel')} body={opportunity.requirements} />
        )}
      </div>
    </Card>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-foreground">{children}</dd>
    </div>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {/* Author-entered text: newlines are meaningful, but it is never rendered as markup. */}
      <p className="mt-1 whitespace-pre-line text-sm text-foreground-secondary">{body}</p>
    </div>
  )
}

/**
 * University targets. Visible for targeted/hybrid internships at any status so the organization can
 * see who was asked; the add/remove form appears only while the opportunity is still editable.
 */
function TargetingSection({
  opportunityId,
  startDate,
  editable,
}: {
  opportunityId: string
  startDate: string
  editable: boolean
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const targetsQuery = useQuery({
    queryKey: ['opportunities', 'targets', opportunityId],
    queryFn: () => opportunityApi.listTargets(opportunityId),
  })
  const universitiesQuery = useQuery({ queryKey: ['universities'], queryFn: universityApi.listUniversities })
  // listUniversities already returns VERIFIED institutions only; an unverified university cannot
  // legitimately receive a nomination request and the backend would refuse the target anyway.
  const universities = universitiesQuery.data ?? []

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
      void invalidateTargets()
    },
  })

  const removeMutation = useMutation({
    mutationFn: (targetId: string) => opportunityApi.removeTarget(opportunityId, targetId),
    onSuccess: invalidateTargets,
  })

  const universityName = (id: string) => universities.find((university) => university.id === id)?.name ?? id
  const targets = targetsQuery.data ?? []

  return (
    <Card padding="lg">
      <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
        {t('opportunities:targets.title')}
      </h2>
      <p className="mt-1 text-sm text-foreground-secondary">{t('opportunities:targets.hint')}</p>

      {targets.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-foreground-secondary">
          {t('opportunities:targets.empty')}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {targets.map((target) => (
            <li
              key={target.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-surface-muted p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{universityName(target.universityId)}</p>
                <p className="mt-1 text-sm text-foreground-secondary">
                  {t('opportunities:targets.summary', {
                    count: target.requestedNominees,
                    deadline: formatDate(target.nominationDeadline),
                  })}
                </p>
                {target.departmentIds.length > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    {t('opportunities:targets.departmentCount', { count: target.departmentIds.length })}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge tone={OPPORTUNITY_TARGET_STATUS_TONE[target.status]}>
                  {t(`recruitment:targetStatusValues.${target.status}`)}
                </StatusBadge>
                {editable && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    loading={removeMutation.isPending && removeMutation.variables === target.id}
                    onClick={() => removeMutation.mutate(target.id)}
                  >
                    {t('opportunities:targets.remove')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <form
          className="mt-5 flex flex-col gap-4 border-t border-border pt-5"
          noValidate
          onSubmit={form.handleSubmit((values) => addMutation.mutate(values))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t('opportunities:targets.universityLabel')}
              htmlFor="target-university"
              error={form.formState.errors.universityId && t(form.formState.errors.universityId.message ?? '')}
            >
              <Select id="target-university" {...form.register('universityId')}>
                <option value="">{t('opportunities:targets.selectUniversity')}</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label={t('opportunities:targets.nomineesLabel')}
              htmlFor="target-nominees"
              error={form.formState.errors.requestedNominees && t(form.formState.errors.requestedNominees.message ?? '')}
            >
              <Input id="target-nominees" type="number" min={1} {...form.register('requestedNominees', { valueAsNumber: true })} />
            </FormField>

            <FormField
              label={t('opportunities:targets.deadlineLabel')}
              htmlFor="target-deadline"
              error={form.formState.errors.nominationDeadline && t(form.formState.errors.nominationDeadline.message ?? '')}
            >
              <Input id="target-deadline" type="date" max={startDate} {...form.register('nominationDeadline')} />
            </FormField>
          </div>

          {selectedUniversityId && (
            <fieldset>
              <legend className="text-sm font-medium text-foreground">{t('opportunities:targets.departmentsLabel')}</legend>
              <p className="mt-0.5 text-xs text-foreground-secondary">{t('opportunities:targets.departmentsHint')}</p>
              {/* Checkboxes rather than a native multi-select: `<select multiple>` hides how many
                  are chosen and is close to unusable on a phone, and RHF collects the same value. */}
              <div className="mt-2 grid gap-2 rounded-md border border-border bg-surface-muted p-3 sm:grid-cols-2">
                {(departmentsQuery.data ?? []).map((department) => (
                  <Checkbox
                    key={department.id}
                    id={`target-dept-${department.id}`}
                    value={department.id}
                    label={department.name}
                    {...form.register('departmentIds')}
                  />
                ))}
                {departmentsQuery.data?.length === 0 && (
                  <p className="text-sm text-foreground-secondary">{t('opportunities:targets.noDepartments')}</p>
                )}
              </div>
            </fieldset>
          )}

          {addMutation.isError && (
            <Alert tone="danger">{apiErrorMessage(t, 'opportunities', 'targets', addMutation.error)}</Alert>
          )}

          <div>
            <Button type="submit" variant="outline" loading={addMutation.isPending}>
              {t('opportunities:targets.addSubmit')}
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
