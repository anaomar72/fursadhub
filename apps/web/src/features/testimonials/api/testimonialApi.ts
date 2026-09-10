import { apiFetch } from '../../../lib/api/client'
import type {
  PublicTestimonial,
  SubmitTestimonialInput,
  Testimonial,
  TestimonialAuthorContext,
} from '../types'

/** Public and unauthenticated. The server returns PUBLISHED rows only — see PublicTestimonialController. */
export function listPublishedTestimonials() {
  return apiFetch<PublicTestimonial[]>('/public/testimonials')
}

export function listMyTestimonials() {
  return apiFetch<Testimonial[]>('/me/testimonial')
}

/** How the signed-in user would be attributed. Display only — the server derives it again on write. */
export function getMyTestimonialContext() {
  return apiFetch<TestimonialAuthorContext>('/me/testimonial/context')
}

export function submitTestimonial(input: SubmitTestimonialInput) {
  return apiFetch<Testimonial>('/me/testimonial', { method: 'POST', body: input })
}
