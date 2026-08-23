import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormField, Input, Select, Textarea } from '../../../components/ui'
import type { OpportunityFormValues } from '../schemas/opportunityFormSchema'

const MODES: OpportunityFormValues['mode'][] = ['PUBLIC', 'UNIVERSITY_TARGETED', 'HYBRID']
const WORK_MODES: OpportunityFormValues['workMode'][] = ['ONSITE', 'HYBRID', 'REMOTE']

/** Shared field set for create/edit opportunity forms — only the submit button differs by page. */
export function OpportunityFormFields({ form }: { form: UseFormReturn<OpportunityFormValues> }) {
  const { t } = useTranslation()
  const errors = form.formState.errors
  const mode = form.watch('mode')

  return (
    <>
      <FormField label={t('opportunities:form.titleLabel')} htmlFor="opp-title" error={errors.title && t(errors.title.message ?? '')}>
        <Input id="opp-title" {...form.register('title')} />
      </FormField>

      <FormField
        label={t('opportunities:form.descriptionLabel')}
        htmlFor="opp-description"
        error={errors.description && t(errors.description.message ?? '')}
      >
        <Textarea id="opp-description" {...form.register('description')} />
      </FormField>

      <FormField label={t('opportunities:form.responsibilitiesLabel')} htmlFor="opp-responsibilities">
        <Textarea id="opp-responsibilities" {...form.register('responsibilities')} />
      </FormField>

      <FormField label={t('opportunities:form.requirementsLabel')} htmlFor="opp-requirements">
        <Textarea id="opp-requirements" {...form.register('requirements')} />
      </FormField>

      <FormField label={t('opportunities:form.modeLabel')} htmlFor="opp-mode">
        <Select id="opp-mode" {...form.register('mode')}>
          {MODES.map((value) => (
            <option key={value} value={value}>
              {t(`opportunities:modeValues.${value}`)}
            </option>
          ))}
        </Select>
      </FormField>
      <p className="-mt-2 text-xs text-foreground-secondary">{t(`opportunities:form.modeHelp.${mode}`)}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={t('opportunities:form.openingsLabel')}
          htmlFor="opp-openings"
          error={errors.numberOfOpenings && t(errors.numberOfOpenings.message ?? '')}
        >
          <Input id="opp-openings" type="number" min={1} {...form.register('numberOfOpenings', { valueAsNumber: true })} />
        </FormField>

        <FormField label={t('opportunities:form.workModeLabel')} htmlFor="opp-work-mode">
          <Select id="opp-work-mode" {...form.register('workMode')}>
            {WORK_MODES.map((value) => (
              <option key={value} value={value}>
                {t(`opportunities:workModeValues.${value}`)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label={t('opportunities:form.locationLabel')} htmlFor="opp-location">
        <Input id="opp-location" {...form.register('location')} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={t('opportunities:form.startDateLabel')}
          htmlFor="opp-start-date"
          error={errors.startDate && t(errors.startDate.message ?? '')}
        >
          <Input id="opp-start-date" type="date" {...form.register('startDate')} />
        </FormField>
        <FormField
          label={t('opportunities:form.endDateLabel')}
          htmlFor="opp-end-date"
          error={errors.endDate && t(errors.endDate.message ?? '')}
        >
          <Input id="opp-end-date" type="date" {...form.register('endDate')} />
        </FormField>
      </div>

      <FormField
        label={t('opportunities:form.applicationDeadlineLabel')}
        htmlFor="opp-deadline"
        error={errors.applicationDeadline && t(errors.applicationDeadline.message ?? '')}
      >
        <Input id="opp-deadline" type="date" {...form.register('applicationDeadline')} />
      </FormField>
    </>
  )
}
