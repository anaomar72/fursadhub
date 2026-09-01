import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import { createOrganizationSchema, type CreateOrganizationFormValues } from '../schemas/organizationProfileSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, FormField, Input, PageHeader, Select, Textarea } from '../../../components/ui'

const TYPES: CreateOrganizationFormValues['type'][] = ['COMPANY', 'NGO', 'GOVERNMENT', 'OTHER']

/** Shown inside OrganizationAreaLayout when the caller has no active organization membership yet. */
export function OrganizationSetupPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: '', type: 'COMPANY', registrationNumber: '', website: '', description: '' },
  })

  const createMutation = useMutation({
    mutationFn: organizationApi.createOrganization,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'my-memberships'] }),
  })

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <PageHeader title={t('organization:setup.title')} description={t('organization:setup.body')} />

      <form
        className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
        noValidate
        onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
      >
        <FormField
          label={t('organization:setup.nameLabel')}
          htmlFor="org-name"
          error={form.formState.errors.name && t(form.formState.errors.name.message ?? '')}
        >
          <Input id="org-name" {...form.register('name')} />
        </FormField>

        <FormField label={t('organization:setup.typeLabel')} htmlFor="org-type">
          <Select id="org-type" {...form.register('type')}>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`organization:profile.types.${type}`)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('organization:setup.registrationNumberLabel')} htmlFor="org-registration">
          <Input id="org-registration" {...form.register('registrationNumber')} />
        </FormField>

        <FormField label={t('organization:setup.websiteLabel')} htmlFor="org-website">
          <Input id="org-website" type="url" {...form.register('website')} />
        </FormField>

        <FormField label={t('organization:setup.descriptionLabel')} htmlFor="org-description">
          <Textarea id="org-description" {...form.register('description')} />
        </FormField>

        {createMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'organization', 'setup', createMutation.error)}
          </p>
        )}

        <Button type="submit" loading={createMutation.isPending} className="w-full sm:w-auto">
          {t('organization:setup.submit')}
        </Button>
      </form>
    </div>
  )
}
