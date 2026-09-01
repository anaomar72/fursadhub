import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { createUniversitySchema, type CreateUniversityFormValues } from '../schemas/universitySetupSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, FormField, Input, PageHeader, Textarea } from '../../../components/ui'

/** Shown inside UniversityAreaLayout when the caller has no active university membership yet
 * (mirrors OrganizationSetupPage). */
export function UniversitySetupPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const form = useForm<CreateUniversityFormValues>({
    resolver: zodResolver(createUniversitySchema),
    defaultValues: { name: '', city: '', registrationNumber: '', website: '', description: '' },
  })

  const createMutation = useMutation({
    mutationFn: universityApi.createUniversity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['university', 'my-membership'] }),
  })

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <PageHeader title={t('university:setup.title')} description={t('university:setup.body')} />

      <form
        className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
        noValidate
        onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
      >
        <FormField
          label={t('university:setup.nameLabel')}
          htmlFor="uni-name"
          error={form.formState.errors.name && t(form.formState.errors.name.message ?? '')}
        >
          <Input id="uni-name" {...form.register('name')} />
        </FormField>

        <FormField label={t('university:setup.cityLabel')} htmlFor="uni-city">
          <Input id="uni-city" {...form.register('city')} />
        </FormField>

        <FormField label={t('university:setup.registrationNumberLabel')} htmlFor="uni-registration">
          <Input id="uni-registration" {...form.register('registrationNumber')} />
        </FormField>

        <FormField label={t('university:setup.websiteLabel')} htmlFor="uni-website">
          <Input id="uni-website" type="url" {...form.register('website')} />
        </FormField>

        <FormField label={t('university:setup.descriptionLabel')} htmlFor="uni-description">
          <Textarea id="uni-description" {...form.register('description')} />
        </FormField>

        {createMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'university', 'setup', createMutation.error)}
          </p>
        )}

        <Button type="submit" loading={createMutation.isPending} className="w-full sm:w-auto">
          {t('university:setup.submit')}
        </Button>
      </form>
    </div>
  )
}
