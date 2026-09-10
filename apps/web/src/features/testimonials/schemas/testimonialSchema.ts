import { z } from 'zod'

/**
 * Mirrors the server's Bean Validation exactly (SubmitTestimonialRequest). The server remains the
 * authority — this only spares the author a round trip to be told their quote is too short.
 *
 * <p>There is no `authorRole` and no `authorAffiliation` here, and that absence is the point: both
 * are derived server-side from the author's real membership. A schema field for either would be a
 * field the browser could set.
 */
export const testimonialSchema = z.object({
  authorDisplayName: z
    .string()
    .trim()
    .min(1, 'testimonials:errors.nameRequired')
    .max(120, 'testimonials:errors.nameTooLong'),
  body: z
    .string()
    .trim()
    .min(40, 'testimonials:errors.bodyTooShort')
    .max(1000, 'testimonials:errors.bodyTooLong'),
  // Required, matching the server: `SubmitTestimonialRequest` is @NotNull @Min(1) @Max(5) and
  // `Testimonial.submit` refuses anything else in the domain. Typed as a number with no default, so
  // a form that never touched the control fails here rather than silently sending a made-up score.
  rating: z
    .number({ message: 'testimonials:errors.ratingRequired' })
    .int('testimonials:errors.ratingRequired')
    .min(1, 'testimonials:errors.ratingRequired')
    .max(5, 'testimonials:errors.ratingRequired'),
})

export type TestimonialFormValues = z.infer<typeof testimonialSchema>
