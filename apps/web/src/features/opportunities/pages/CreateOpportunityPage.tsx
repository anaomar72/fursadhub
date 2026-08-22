import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import * as opportunityApi from '../api/opportunityApi'
import { opportunityFormSchema, type OpportunityFormValues } from '../schemas/opportunityFormSchema'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button } from '../../../components/ui'
import { OpportunityFormFields } from '../components/OpportunityFormFields'

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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{t('opportunities:form.createTitle')}</h1>

      <form
        className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
        noValidate
        onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
      >
        <OpportunityFormFields form={form} />

        {createMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'opportunities', 'form', createMutation.error)}
          </p>
        )}

        <Button type="submit" loading={createMutation.isPending} className="w-full sm:w-auto">
          {t('opportunities:form.createSubmit')}
        </Button>
      </form>
    </div>
  )
}
