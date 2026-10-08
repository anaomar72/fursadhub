import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { createUniversitySchema, type CreateUniversityFormValues } from '../schemas/universitySetupSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Alert, Button, FormField, FormSection, Icon, Input, PageHeader, Stepper, Textarea } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

/**
 * Shown inside UniversityAreaLayout when the caller has no active university membership yet — the
 * first screen a new university account sees after signing in. Same composition as
 * OrganizationSetupPage (real onboarding progress, fields grouped by purpose, the next step said
 * before the button), with the university's own fields and wording. The request body is unchanged.
 */
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
    <PageContainer width="narrow" className="flex flex-col gap-8">
      <PageHeader title={t('university:setup.title')} description={t('university:setup.body')} />

      <Stepper
        orientation="horizontal"
        label={t('common:onboarding.progressLabel')}
        currentStep={2}
        steps={[
          { label: t('common:onboarding.steps.account') },
          { label: t('common:onboarding.steps.email') },
          { label: t('university:setup.stepDetails') },
          { label: t('common:onboarding.steps.verification') },
        ]}
      />

      <form className="flex flex-col" noValidate onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
        <FormSection
          layout="stacked"
          title={t('university:setup.sections.identity.title')}
          description={t('university:setup.sections.identity.description')}
        >
          <FormField
            label={t('university:setup.nameLabel')}
            htmlFor="uni-name"
            required
            error={form.formState.errors.name && t(form.formState.errors.name.message ?? '')}
          >
            <Input id="uni-name" autoComplete="organization" invalid={!!form.formState.errors.name} {...form.register('name')} />
          </FormField>

          <FormField label={t('university:setup.cityLabel')} htmlFor="uni-city" optional>
            <Input id="uni-city" autoComplete="address-level2" {...form.register('city')} />
          </FormField>
        </FormSection>

        <FormSection
          layout="stacked"
          title={t('university:setup.sections.registration.title')}
          description={t('university:setup.sections.registration.description')}
        >
          {/* Optional server-side (CreateUniversityRequest has no @NotBlank) and never public. The
              label already reads "(optional)". */}
          <FormField
            label={t('university:setup.registrationNumberLabel')}
            htmlFor="uni-registration"
            hint={t('university:setup.registrationNumberHint')}
          >
            <Input id="uni-registration" {...form.register('registrationNumber')} />
          </FormField>
        </FormSection>

        <FormSection
          layout="stacked"
          title={t('university:setup.sections.public.title')}
          description={t('university:setup.sections.public.description')}
        >
          <FormField label={t('university:setup.websiteLabel')} htmlFor="uni-website" optional>
            <Input id="uni-website" type="url" autoComplete="url" placeholder="https://" {...form.register('website')} />
          </FormField>

          <FormField label={t('university:setup.descriptionLabel')} htmlFor="uni-description" optional>
            <Textarea id="uni-description" {...form.register('description')} />
          </FormField>
        </FormSection>

        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6">
          <div className="flex items-start gap-3 rounded-lg bg-surface-muted p-4">
            <Icon name="info" className="mt-0.5 size-5 shrink-0 text-info" />
            <div className="min-w-0">
              <p className="text-label text-foreground">{t('university:setup.nextTitle')}</p>
              <p className="mt-1 text-body text-foreground-secondary">{t('university:setup.nextBody')}</p>
            </div>
          </div>

          {createMutation.isError && (
            <Alert tone="danger">{apiErrorMessage(t, 'university', 'setup', createMutation.error)}</Alert>
          )}

          <Button type="submit" size="lg" loading={createMutation.isPending} className="w-full sm:w-auto sm:self-start">
            {t('university:setup.submit')}
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
