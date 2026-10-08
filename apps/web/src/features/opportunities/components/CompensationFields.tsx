import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormField, Input, Select } from '../../../components/ui'
import { COMPENSATION_TYPES, acceptsAmount, acceptsMaximum } from '../compensation'
import type { OpportunityFormValues } from '../schemas/opportunityFormSchema'
import type { CompensationPeriod } from '../types'

const PERIODS: CompensationPeriod[] = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'TOTAL']

/**
 * The Backend Phase B3 compensation section: a type, and the amount fields that type admits.
 *
 * <p>Controls appear and disappear with the type, mirroring `Compensation.of` — an `UNPAID`
 * internship shows no amount, a `FIXED` one shows a single amount, a `RANGE` shows both bounds.
 *
 * <p><strong>Hiding a control is presentation, not clearing.</strong> The submitted payload is
 * rebuilt from the type in `buildCompensation`, which never reads a field the current type does not
 * admit — so switching FIXED → UNPAID cannot ship the old amount even though React Hook Form is
 * still holding it. This section additionally blanks the values on switch, so the user sees the
 * change rather than only being protected from it: a hidden-but-retained "500" that silently
 * reappears when they switch back is a surprise either way.
 */
/**
 * `framed` (default) draws its own bordered fieldset; `framed={false}` renders the same fields
 * under a visually hidden legend, for a caller that already titles the group (a FormSection).
 */
export function CompensationFields({ form, framed = true }: { form: UseFormReturn<OpportunityFormValues>; framed?: boolean }) {
  const { t } = useTranslation()
  const errors = form.formState.errors
  const type = form.watch('compensationType')

  const showsAmount = !!type && acceptsAmount(type)
  const showsMaximum = !!type && acceptsMaximum(type)

  return (
    <fieldset className={framed ? 'rounded-lg border border-border p-4' : 'min-w-0'}>
      <legend className={framed ? 'px-1.5 text-sm font-bold text-brand-navy dark:text-foreground' : 'sr-only'}>
        {t('opportunities:form.compensationLegend')}
      </legend>

      <div className="flex flex-col gap-4">
        <FormField
          label={t('opportunities:form.compensationTypeLabel')}
          htmlFor="opp-compensation-type"
          hint={t('opportunities:form.compensationTypeHint')}
        >
          <Select
            id="opp-compensation-type"
            value={type}
            onChange={(event) => {
              const next = event.target.value as OpportunityFormValues['compensationType']
              form.setValue('compensationType', next, { shouldDirty: true })
              // Blank every field the new type cannot carry, so the form shows what will be sent.
              if (!next || !acceptsAmount(next)) {
                form.setValue('minimumAmount', '', { shouldDirty: true })
                form.setValue('currencyCode', '', { shouldDirty: true })
                form.setValue('compensationPeriod', '', { shouldDirty: true })
              }
              if (!next || !acceptsMaximum(next)) {
                form.setValue('maximumAmount', '', { shouldDirty: true })
              }
              void form.trigger(['minimumAmount', 'maximumAmount', 'currencyCode', 'compensationPeriod'])
            }}
          >
            <option value="">{t('opportunities:form.compensationNotStated')}</option>
            {COMPENSATION_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(`opportunities:compensation.typeValues.${value}`)}
              </option>
            ))}
          </Select>
        </FormField>

        {showsAmount && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={
                showsMaximum
                  ? t('opportunities:form.minimumAmountLabel')
                  : t('opportunities:form.amountLabel')
              }
              htmlFor="opp-minimum-amount"
              hint={type === 'NEGOTIABLE' ? t('opportunities:form.negotiableAmountHint') : undefined}
              error={errors.minimumAmount && t(errors.minimumAmount.message ?? '')}
            >
              <Input
                id="opp-minimum-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                {...form.register('minimumAmount')}
              />
            </FormField>

            {showsMaximum && (
              <FormField
                label={t('opportunities:form.maximumAmountLabel')}
                htmlFor="opp-maximum-amount"
                error={errors.maximumAmount && t(errors.maximumAmount.message ?? '')}
              >
                <Input
                  id="opp-maximum-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  {...form.register('maximumAmount')}
                />
              </FormField>
            )}

            <FormField
              label={t('opportunities:form.currencyLabel')}
              htmlFor="opp-currency"
              hint={t('opportunities:form.currencyHint')}
              error={errors.currencyCode && t(errors.currencyCode.message ?? '')}
            >
              <Input id="opp-currency" type="text" maxLength={3} autoComplete="off" {...form.register('currencyCode')} />
            </FormField>

            <FormField
              label={t('opportunities:form.compensationPeriodLabel')}
              htmlFor="opp-compensation-period"
              error={errors.compensationPeriod && t(errors.compensationPeriod.message ?? '')}
            >
              <Select id="opp-compensation-period" {...form.register('compensationPeriod')}>
                <option value="">{t('opportunities:form.periodNotStated')}</option>
                {PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {t(`opportunities:form.periodValues.${period}`)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        )}
      </div>
    </fieldset>
  )
}
