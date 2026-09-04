import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import * as opportunityApi from '../api/opportunityApi'
import { opportunityFormSchema, type OpportunityFormValues } from '../schemas/opportunityFormSchema'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Alert, Breadcrumbs, Button, ButtonLink, Card, PageHeader } from '../../../components/ui'
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
  const { organizationId } = useOrganizationMembership()

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      title: '',
      description: '',
      responsibilities: '',
      requirements: '',
      mode: 'PUBLIC',
      numberOfOpenings: 1,
      workMode: 'ONSITE',
      location: '',
      startDate: '',
      endDate: '',
      applicationDeadline: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: OpportunityFormValues) => opportunityApi.createOpportunity(organizationId, values),
    onSuccess: (opportunity) => navigate(`/organization/opportunities/${opportunity.id}`),
  })

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
        <Card padding="lg" className="flex flex-col gap-4">
          <OpportunityFormFields form={form} />

          {createMutation.isError && (
            <Alert tone="danger">{apiErrorMessage(t, 'opportunities', 'form', createMutation.error)}</Alert>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="submit" loading={createMutation.isPending}>
              {t('opportunities:form.createSubmit')}
            </Button>
            <ButtonLink variant="ghost" to="/organization/opportunities">
              {t('common:actions.cancel')}
            </ButtonLink>
          </div>
        </Card>
      </form>
    </PageContainer>
  )
}
