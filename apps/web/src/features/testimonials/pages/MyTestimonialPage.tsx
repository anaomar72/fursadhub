import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  PageHeader,
  StarRating,
  StarRatingInput,
  StatusBadge,
  Textarea,
  SkeletonPanel,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { formatDate } from '../../../lib/utils/formatDate'
import { getMyTestimonialContext, listMyTestimonials, submitTestimonial } from '../api/testimonialApi'
import { testimonialAttribution } from '../attribution'
import { testimonialSchema, type TestimonialFormValues } from '../schemas/testimonialSchema'
import type { Testimonial } from '../types'
import { TESTIMONIAL_STATUS_TONE } from '../../../lib/status/statusTones'

const STATUS_TONE = TESTIMONIAL_STATUS_TONE

/**
 * Where a user offers a testimonial, and sees what became of it.
 *
 * <p>Open to every FursadHub role — student, organization staff, university staff and FursadHub's
 * own platform staff — because it lives in the role-neutral `/account` area rather than inside any
 * one portal. There is one form, not one per role.
 *
 * <p>The role is SHOWN, not asked. The author picks the name printed beside their words, because a
 * byline is a consent decision; they do not pick their role or their institution, because those are
 * facts about their account and the server derives both. The read-only "You are sharing as" line is
 * a courtesy so nobody is surprised by their own attribution — it is not a control, and the value
 * that reaches the published row is resolved again server-side at submission.
 *
 * <p>The page is also explicit that submitting is not publishing: a platform moderator decides, and
 * the status shown here is the real server state rather than an optimistic one.
 */
export function MyTestimonialPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const mine = useQuery({ queryKey: ['my-testimonials'], queryFn: listMyTestimonials })
  const context = useQuery({ queryKey: ['my-testimonial-context'], queryFn: getMyTestimonialContext })

  const form = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialSchema),
    // `rating` has no default on purpose: an untouched control must fail validation rather than
    // send a score the author never chose.
    defaultValues: { authorDisplayName: '', body: '' },
  })

  const submit = useMutation({
    mutationFn: submitTestimonial,
    onSuccess: () => {
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['my-testimonials'] })
    },
  })

  // One live testimonial per author, matching the server's partial unique index. A rejected one may
  // be replaced, so the form comes back rather than locking the author out permanently.
  const hasLive = (mine.data ?? []).some((item) => item.status !== 'REJECTED')
  // An account with no student profile and no membership has no role to attribute a story to. The
  // server refuses that case outright; the form explains it instead of failing on submit.
  const eligible = context.data?.eligible ?? false
  const showForm = !hasLive && eligible

  return (
    <PageContainer>
      <PageHeader title={t('testimonials:title')} description={t('testimonials:description')} />

      {mine.isPending || context.isPending ? (
        <SkeletonPanel rows={5} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          {showForm && (
            <Card padding="lg" className="lg:order-2 lg:col-start-1 lg:row-start-1">
              <h2 className="font-display text-title-panel text-foreground">
                {t('testimonials:form.title')}
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">{t('testimonials:form.moderationNotice')}</p>

              <form
                className="mt-5 space-y-4"
                onSubmit={form.handleSubmit((values) => submit.mutate(values))}
              >
                <SharingAsPanel context={context.data!} />

                <FormField
                  htmlFor="testimonial-name"
                  label={t('testimonials:form.displayName')}
                  hint={t('testimonials:form.displayNameHint')}
                  error={
                    form.formState.errors.authorDisplayName &&
                    t(form.formState.errors.authorDisplayName.message ?? '')
                  }
                >
                  <Input id="testimonial-name" autoComplete="name" {...form.register('authorDisplayName')} />
                </FormField>

                {/*
                  `Controller`, not `register`: the value is a NUMBER and the control is a radio
                  group, so react-hook-form's string-valued input registration is the wrong shape.
                */}
                <Controller
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <div>
                      <StarRatingInput
                        label={t('testimonials:form.rating')}
                        value={field.value ?? null}
                        onChange={field.onChange}
                        invalid={!!form.formState.errors.rating}
                        describedBy={form.formState.errors.rating ? 'testimonial-rating-error' : undefined}
                      />
                      {form.formState.errors.rating && (
                        <p id="testimonial-rating-error" role="alert" className="mt-1 text-sm text-danger">
                          {t(form.formState.errors.rating.message ?? '')}
                        </p>
                      )}
                    </div>
                  )}
                />

                <FormField
                  htmlFor="testimonial-body"
                  label={t('testimonials:form.body')}
                  hint={t('testimonials:form.bodyHint')}
                  error={form.formState.errors.body && t(form.formState.errors.body.message ?? '')}
                >
                  <Textarea id="testimonial-body" rows={6} maxLength={1000} {...form.register('body')} />
                </FormField>

                {submit.isError && (
                  <Alert tone="danger">{apiErrorMessage(t, 'testimonials', 'form', submit.error)}</Alert>
                )}

                <Button type="submit" loading={submit.isPending}>
                  {t('testimonials:form.submit')}
                </Button>
              </form>
            </Card>
          )}

          {!hasLive && !eligible && (
            <Card padding="lg" className="lg:order-2 lg:col-start-1 lg:row-start-1">
              <EmptyState
                variant="inline"
                title={t('testimonials:ineligible.title')}
                description={t('testimonials:ineligible.body')}
              />
            </Card>
          )}

          <Card padding="lg" className="lg:col-start-2 lg:row-start-1">
            <h2 className="font-display text-title-panel text-foreground">
              {t('testimonials:mine.title')}
            </h2>
            {(mine.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-foreground-secondary">{t('testimonials:mine.empty')}</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {mine.data!.map((item) => (
                  <li key={item.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge tone={STATUS_TONE[item.status]}>
                        {t(`testimonials:status.${item.status}`)}
                      </StatusBadge>
                      <span className="text-xs text-foreground-secondary">{formatDate(item.submittedAt)}</span>
                    </div>
                    {/* The attribution this quote was frozen under — which may differ from the
                        author's role today, and deliberately does not follow it. */}
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                      {testimonialAttribution(t, item as Testimonial)}
                    </p>
                    {/* Renders nothing for a testimonial submitted before ratings existed. */}
                    <StarRating value={item.rating} className="mt-2" />
                    <blockquote className="mt-2 whitespace-pre-line text-sm leading-6 text-foreground">
                      {item.body}
                    </blockquote>
                    {item.moderationNote && (
                      <p className="mt-2 text-sm text-foreground-secondary">
                        {t('testimonials:mine.moderatorNote', { note: item.moderationNote })}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </PageContainer>
  )
}

/**
 * "You are sharing as: Recruiter at Acme Ltd."
 *
 * <p>Rendered as text rather than as a disabled `<select>` on purpose. A greyed-out control still
 * says "this is a choice you happen not to have"; a sentence says what is true. There is no form
 * field here, so nothing about the role travels with the submission.
 */
function SharingAsPanel({
  context,
}: {
  context: { authorRole?: string | null; authorAudience?: string | null; authorAffiliation?: string | null }
}) {
  const { t } = useTranslation()
  const attribution = testimonialAttribution(t, {
    authorRole: context.authorRole as never,
    authorAudience: (context.authorAudience ?? 'STUDENT') as never,
    authorAffiliation: context.authorAffiliation,
  })

  return (
    <div className="rounded-lg border border-border bg-surface-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        {t('testimonials:form.sharingAs')}
      </p>
      <p className="mt-1 font-display text-sm font-bold text-brand-navy dark:text-foreground">{attribution}</p>
      <p className="mt-1 text-xs leading-5 text-foreground-secondary">{t('testimonials:form.sharingAsHint')}</p>
    </div>
  )
}
