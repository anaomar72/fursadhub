import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import * as opportunityApi from '../api/opportunityApi'
import { opportunityFormSchema, type OpportunityFormValues } from '../schemas/opportunityFormSchema'
import { buildOpportunityPayload, emptyOpportunityFormValues } from '../opportunityPayload'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { organizationCapabilities } from '../../organization/organizationCapabilities'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Alert, Breadcrumbs, Button, ButtonLink, EmptyState, PageHeader } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { OpportunityFormFields } from '../components/OpportunityFormFields'

/**
 * Creating an internship.
 *
 * <p>Every field the backend contract carries is present — including the ones the prototype does
 * not show — because {@code CreateOpportunityService} and {@code OpportunityFieldValidation} require
 * them, and a form that omits a required field just produces a 400 the user cannot fix. The mode
 * selector is first-class for the same reason: it decides whether the internship can be applied to
 * directly, nominated into, or both, and it is not editable after publication.
 *
 * <p>The internship is created as a DRAFT (CLAUDE.md section 33) — publishing is a separate,
 * explicit command on the detail page, so nothing goes live by filling in a form.
 */
export function CreateOpportunityPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const membership = useOrganizationMembership()
  const { organizationId } = membership
  // CreateOpportunityService admits ORGANIZATION_ADMIN and RECRUITER only, so an
  // ORGANIZATION_SUPERVISOR reaching this URL directly would get a form whose every submit is a
  // 403. The sidebar already omits the destination; this is the same rule applied to the page a
  // typed URL still reaches (CLAUDE.md section 24 — the backend remains the boundary either way).
  const canManageOpportunities = organizationCapabilities(membership).canManageOpportunities

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: emptyOpportunityFormValues(),
  })

  const createMutation = useMutation({
    // Never the raw form values: buildOpportunityPayload rebuilds compensation from the CURRENT
    // type, so an amount left in form state by a type switch is not submitted (Backend Phase B3).
    mutationFn: (values: OpportunityFormValues) =>
      opportunityApi.createOpportunity(organizationId, buildOpportunityPayload(values)),
    onSuccess: (opportunity) => navigate(`/organization/opportunities/${opportunity.id}`),
  })

  if (!canManageOpportunities) {
    return (
      <PageContainer className="flex flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: t('opportunities:list.title'), to: '/organization/opportunities' },
            { label: t('opportunities:form.createTitle') },
          ]}
        />
        <EmptyState
          title={t('opportunities:form.notAuthorizedTitle')}
          description={t('opportunities:form.notAuthorizedBody')}
          action={<ButtonLink variant="outline" to="/organization/opportunities">{t('opportunities:list.title')}</ButtonLink>}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('opportunities:list.title'), to: '/organization/opportunities' },
          { label: t('opportunities:form.createTitle') },
        ]}
      />

      <PageHeader
        eyebrow={t('organization:nav.opportunities')}
        title={t('opportunities:form.createTitle')}
        description={t('opportunities:form.createHint')}
      />

      <form noValidate onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
        <div className="flex flex-col gap-4">
          <OpportunityFormFields form={form} />

          {createMutation.isError && (
            <Alert tone="danger">{apiErrorMessage(t, 'opportunities', 'form', createMutation.error)}</Alert>
          )}

          <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm">
            <Button type="submit" loading={createMutation.isPending}>
              {t('opportunities:form.createSubmit')}
            </Button>
            <ButtonLink variant="ghost" to="/organization/opportunities">
              {t('common:actions.cancel')}
            </ButtonLink>
          </div>
        </div>
      </form>
    </PageContainer>
  )
}
