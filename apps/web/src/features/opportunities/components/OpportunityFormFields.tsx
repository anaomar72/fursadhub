import { Controller, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormField, FormSection, Icon, Input, RadioCard, Select, TagInput, Textarea, type IconName } from '../../../components/ui'
import {
  MAX_HOURS_PER_WEEK,
  MAX_PERKS,
  MAX_PERK_LENGTH,
  MAX_SKILLS,
  MAX_SKILL_LENGTH,
  MIN_HOURS_PER_WEEK,
  type OpportunityFormValues,
} from '../schemas/opportunityFormSchema'
import { CompensationFields } from './CompensationFields'

const WORK_MODES: OpportunityFormValues['workMode'][] = ['ONSITE', 'HYBRID', 'REMOTE']

/** The three sourcing modes (CLAUDE.md section 32) — one opportunity model, three ways to fill it. */
const MODES: { mode: OpportunityFormValues['mode']; icon: IconName }[] = [
  { mode: 'PUBLIC', icon: 'globe' },
  { mode: 'UNIVERSITY_TARGETED', icon: 'bank' },
  { mode: 'HYBRID', icon: 'users' },
]

/**
 * The internship editor's fields, shared by create and edit.
 *
 * <p>Phase 6: six purposeful groups instead of a dozen single-field boxes — what the internship
 * is, the role, who can be considered, dates and capacity, the working arrangement, and what it
 * offers. Field ids, registrations and therefore the payload are unchanged
 * ({@code buildOpportunityPayload}); only the grouping and guidance are new.
 *
 * <p><strong>Audience.</strong> The sourcing mode is a choice between three explained options
 * rather than a bare select, because the choice decides who may be considered. The UI does not
 * relax any rule: the schema still enforces the deadline for public and hybrid internships, and
 * targeted universities are still chosen on the internship page after it exists — which the
 * targeted and hybrid options say.
 */
export function OpportunityFormFields({ form }: { form: UseFormReturn<OpportunityFormValues> }) {
  const { t } = useTranslation()
  const errors = form.formState.errors
  const mode = form.watch('mode')
  const err = (message?: string) => (message ? t(message) : undefined)

  return (
    <div className="flex flex-col">
      {/* ------------------------------------------------------------ what it is */}
      <FormSection title={t('opportunities:form.sections.basics.title')} description={t('opportunities:form.sections.basics.description')}>
        <FormField label={t('opportunities:form.titleLabel')} htmlFor="opp-title" required error={err(errors.title?.message)}>
          <Input id="opp-title" invalid={!!errors.title} {...form.register('title')} />
        </FormField>
        <FormField label={t('opportunities:form.descriptionLabel')} htmlFor="opp-description" required error={err(errors.description?.message)}>
          <Textarea id="opp-description" rows={5} invalid={!!errors.description} {...form.register('description')} />
        </FormField>
      </FormSection>

      {/* ------------------------------------------------------------ the role */}
      <FormSection title={t('opportunities:form.sections.role.title')} description={t('opportunities:form.sections.role.description')}>
        <FormField label={t('opportunities:form.responsibilitiesLabel')} htmlFor="opp-responsibilities" optional error={err(errors.responsibilities?.message)}>
          <Textarea id="opp-responsibilities" {...form.register('responsibilities')} />
        </FormField>
        <FormField label={t('opportunities:form.requirementsLabel')} htmlFor="opp-requirements" optional error={err(errors.requirements?.message)}>
          <Textarea id="opp-requirements" {...form.register('requirements')} />
        </FormField>
        <FormField
          label={t('opportunities:form.skillsLabel')}
          htmlFor="opp-skills"
          optional
          hint={t('opportunities:form.skillsHint')}
          error={err(errors.skills?.message)}
        >
          <Controller
            control={form.control}
            name="skills"
            render={({ field }) => (
              <TagInput
                id="opp-skills"
                value={field.value}
                onChange={field.onChange}
                maxTags={MAX_SKILLS}
                maxLength={MAX_SKILL_LENGTH}
                placeholder={t('opportunities:form.skillsPlaceholder')}
              />
            )}
          />
        </FormField>
      </FormSection>

      {/* ------------------------------------------------------------ who can be considered */}
      <FormSection title={t('opportunities:form.sections.audience.title')} description={t('opportunities:form.sections.audience.description')}>
        <fieldset className="min-w-0">
          <legend className="text-label text-foreground">{t('opportunities:form.modeLabel')}</legend>
          <div className="mt-2.5 grid gap-2">
            {MODES.map(({ mode: option, icon }) => {
              const selected = mode === option
              return (
                <RadioCard
                  key={option}
                  idBase={`opp-mode-${option}`}
                  value={option}
                  selected={selected}
                  icon={icon}
                  title={t(`opportunities:modeValues.${option}`)}
                  description={t(`opportunities:form.modeHelp.${option}`)}
                  {...form.register('mode')}
                />
              )
            })}
          </div>
          {mode !== 'PUBLIC' && (
            <p className="mt-2.5 flex items-start gap-1.5 text-caption text-foreground-secondary">
              <Icon name="info" className="mt-px size-3.5 shrink-0" />
              {t('opportunities:form.targetsLater')}
            </p>
          )}
        </fieldset>
      </FormSection>

      {/* ------------------------------------------------------------ dates and capacity */}
      <FormSection title={t('opportunities:form.sections.dates.title')} description={t('opportunities:form.sections.dates.description')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('opportunities:form.startDateLabel')} htmlFor="opp-start-date" required error={err(errors.startDate?.message)}>
            <Input id="opp-start-date" type="date" invalid={!!errors.startDate} {...form.register('startDate')} />
          </FormField>
          <FormField label={t('opportunities:form.endDateLabel')} htmlFor="opp-end-date" required error={err(errors.endDate?.message)}>
            <Input id="opp-end-date" type="date" invalid={!!errors.endDate} {...form.register('endDate')} />
          </FormField>
          <FormField
            label={t('opportunities:form.applicationDeadlineLabel')}
            htmlFor="opp-deadline"
            optional={mode === 'UNIVERSITY_TARGETED'}
            required={mode !== 'UNIVERSITY_TARGETED'}
            hint={mode === 'UNIVERSITY_TARGETED' ? t('opportunities:form.deadlineHintTargeted') : t('opportunities:form.deadlineHint')}
            error={err(errors.applicationDeadline?.message)}
          >
            <Input id="opp-deadline" type="date" invalid={!!errors.applicationDeadline} {...form.register('applicationDeadline')} />
          </FormField>
          <FormField label={t('opportunities:form.openingsLabel')} htmlFor="opp-openings" required error={err(errors.numberOfOpenings?.message)}>
            <Input id="opp-openings" type="number" min={1} invalid={!!errors.numberOfOpenings} {...form.register('numberOfOpenings', { valueAsNumber: true })} />
          </FormField>
        </div>
      </FormSection>

      {/* ------------------------------------------------------------ working arrangement */}
      <FormSection title={t('opportunities:form.sections.arrangement.title')} description={t('opportunities:form.sections.arrangement.description')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('opportunities:form.workModeLabel')} htmlFor="opp-work-mode" required>
            <Select id="opp-work-mode" {...form.register('workMode')}>
              {WORK_MODES.map((workMode) => (
                <option key={workMode} value={workMode}>
                  {t(`opportunities:workModeValues.${workMode}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('opportunities:form.locationLabel')} htmlFor="opp-location" optional error={err(errors.location?.message)}>
            <Input id="opp-location" {...form.register('location')} />
          </FormField>
          <FormField
            label={t('opportunities:form.hoursPerWeekLabel')}
            htmlFor="opp-hours-per-week"
            optional
            hint={t('opportunities:form.hoursPerWeekHint')}
            error={errors.hoursPerWeek && t('opportunities:form.errors.hoursRange')}
          >
            <Controller
              control={form.control}
              name="hoursPerWeek"
              render={({ field }) => (
                <Input
                  id="opp-hours-per-week"
                  type="number"
                  inputMode="numeric"
                  min={MIN_HOURS_PER_WEEK}
                  max={MAX_HOURS_PER_WEEK}
                  value={field.value === '' ? '' : String(field.value)}
                  onBlur={field.onBlur}
                  // An emptied number input yields '', which must STAY ''. Number('') is 0 and
                  // parseInt('') is NaN, and either would submit a value the user just deleted.
                  onChange={(event) => field.onChange(event.target.value === '' ? '' : Number(event.target.value))}
                />
              )}
            />
          </FormField>
        </div>
      </FormSection>

      {/* ------------------------------------------------------------ what it offers */}
      <FormSection title={t('opportunities:form.sections.compensation.title')} description={t('opportunities:form.sections.compensation.description')}>
        <CompensationFields form={form} framed={false} />
        <FormField
          label={t('opportunities:form.perksLabel')}
          htmlFor="opp-perks"
          optional
          hint={t('opportunities:form.perksHint')}
          error={err(errors.perks?.message)}
        >
          <Controller
            control={form.control}
            name="perks"
            render={({ field }) => (
              <TagInput
                id="opp-perks"
                value={field.value}
                onChange={field.onChange}
                maxTags={MAX_PERKS}
                maxLength={MAX_PERK_LENGTH}
                placeholder={t('opportunities:form.perksPlaceholder')}
              />
            )}
          />
        </FormField>
      </FormSection>
    </div>
  )
}
