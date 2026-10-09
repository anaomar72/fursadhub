import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import { createOrganizationSchema, type CreateOrganizationFormValues } from '../schemas/organizationProfileSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Alert, Button, FormField, FormSection, Icon, Input, PageHeader, Select, Stepper, Textarea } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

const TYPES: CreateOrganizationFormValues['type'][] = ['COMPANY', 'NGO', 'GOVERNMENT', 'OTHER']

/**
 * Shown inside OrganizationAreaLayout when the caller has no active organization membership yet —
 * the first screen a new organization account sees after signing in.
 *
 * <p>It opens with where the person is in onboarding. The stepper is real progress, not field
 * grouping: the account exists and its email is verified (they could not be signed in otherwise),
 * this form is the step in hand, and verification is the step after it. The fields are grouped by
 * purpose, the optional ones say so, and what happens after "Create" is stated before it is pressed.
 * The request body is unchanged.
 */
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
    <PageContainer width="narrow" className="flex flex-col gap-8">
      <PageHeader title={t('organization:setup.title')} description={t('organization:setup.body')} />

      <Stepper
        orientation="horizontal"
        label={t('common:onboarding.progressLabel')}
        currentStep={2}
        steps={[
          { label: t('common:onboarding.steps.account') },
          { label: t('common:onboarding.steps.email') },
          { label: t('organization:setup.stepDetails') },
          { label: t('common:onboarding.steps.verification') },
        ]}
      />

      <form className="flex flex-col" noValidate onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
        <FormSection
          layout="stacked"
          title={t('organization:setup.sections.identity.title')}
          description={t('organization:setup.sections.identity.description')}
        >
          <FormField
            label={t('organization:setup.nameLabel')}
            htmlFor="org-name"
            required
            error={form.formState.errors.name && t(form.formState.errors.name.message ?? '')}
          >
            <Input id="org-name" autoComplete="organization" invalid={!!form.formState.errors.name} {...form.register('name')} />
          </FormField>

          <FormField label={t('organization:setup.typeLabel')} htmlFor="org-type" required>
            <Select id="org-type" {...form.register('type')}>
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`organization:profile.types.${type}`)}
                </option>
              ))}
            </Select>
          </FormField>
        </FormSection>

        <FormSection
          layout="stacked"
          title={t('organization:setup.sections.registration.title')}
          description={t('organization:setup.sections.registration.description')}
        >
          {/* Optional server-side (CreateOrganizationRequest has no @NotBlank) and never public. */}
          <FormField
            label={t('organization:setup.registrationNumberLabel')}
            optional
            htmlFor="org-registration"
            hint={t('organization:setup.registrationNumberHint')}
          >
            <Input id="org-registration" {...form.register('registrationNumber')} />
          </FormField>
        </FormSection>

        <FormSection
          layout="stacked"
          title={t('organization:setup.sections.public.title')}
          description={t('organization:setup.sections.public.description')}
        >
          <FormField label={t('organization:setup.websiteLabel')} htmlFor="org-website" optional>
            <Input id="org-website" type="url" autoComplete="url" placeholder="https://" {...form.register('website')} />
          </FormField>

          <FormField label={t('organization:setup.descriptionLabel')} htmlFor="org-description" optional>
            <Textarea id="org-description" {...form.register('description')} />
          </FormField>
        </FormSection>

        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6">
          <div className="flex items-start gap-3 rounded-lg bg-surface-muted p-4">
            <Icon name="info" className="mt-0.5 size-5 shrink-0 text-info" />
            <div className="min-w-0">
              <p className="text-label text-foreground">{t('organization:setup.nextTitle')}</p>
              <p className="mt-1 text-body text-foreground-secondary">{t('organization:setup.nextBody')}</p>
            </div>
          </div>

          {createMutation.isError && (
            <Alert tone="danger">{apiErrorMessage(t, 'organization', 'setup', createMutation.error)}</Alert>
          )}

          <Button type="submit" size="lg" loading={createMutation.isPending} className="w-full sm:w-auto sm:self-start">
            {t('organization:setup.submit')}
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
