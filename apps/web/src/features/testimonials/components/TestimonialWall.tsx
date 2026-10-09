import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { listPublishedTestimonials } from '../api/testimonialApi'
import { isPlatformRole, testimonialAttribution, testimonialRoleLabel } from '../attribution'
import { Reveal, StarRating } from '../../../components/ui'
import { cn } from '../../../lib/utils/cn'
import type { PublicTestimonial } from '../types'

/**
 * The public testimonial row.
 *
 * <p>Every quote here was written by a real FursadHub user and published by a platform moderator —
 * the endpoint behind this serves PUBLISHED rows and nothing else, so there is no code path that
 * puts an unmoderated or invented quote on this page.
 *
 * <p>Attribution is the server's, not the author's. The role beside each name is derived from the
 * writer's real membership and frozen at submission, so a recruiter reads as "Recruiter at Acme
 * Ltd" and never as "Student" — see `attribution.ts`, which is the one place that wording is
 * decided.
 *
 * <p><strong>Nothing published, nothing shown.</strong> Until a moderator has published at least one
 * story the section does not render at all — not even a heading. It used to show three "Awaiting
 * approved testimonials" placeholders, which told a first-time visitor that nobody had anything to
 * say yet. A failed or still-loading request renders nothing for the same reason: an unreachable API
 * is not evidence that anyone said anything.
 *
 * <p><strong>No aggregate is displayed.</strong> A headline average would have to be computed from
 * real published rated testimonials, and with a handful of rows any average says more about the
 * sample than the product. The individual ratings are shown; the summary claim is not made.
 */
export function TestimonialWall() {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['public-testimonials'],
    queryFn: listPublishedTestimonials,
    retry: false,
  })
  /*
   * `Array.isArray` rather than a bare `?? []`: this row sits on the public home page, so an
   * unexpected payload shape must degrade to rendering nothing rather than throw and take
   * the whole page down with it.
   */
  const testimonials = Array.isArray(query.data) ? query.data : []
  const visible = testimonials.slice(0, 3)

  if (visible.length === 0) return null

  return (
    <section className="py-14 lg:py-20" aria-labelledby="community-stories">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-caption font-semibold uppercase tracking-wide text-brand-accent-ink">
          {t('common:remediation.storiesEyebrow')}
        </p>
        <h2
          id="community-stories"
          className="mt-3 font-display text-display-lg text-foreground"
        >
          {t('common:remediation.stories')}
        </h2>
        <p className="mt-3 text-body-lg text-foreground-secondary">
          {t('common:remediation.storiesLead')}
        </p>
      </div>

      {/*
        The grid adapts to how many quotes actually exist. A single published testimonial dropped
        into a fixed three-column grid sits in the left third with two empty columns beside it,
        which reads as a broken layout rather than as one story. Centring and capping the width for
        one or two makes a short row look deliberate, without ever padding it out with people who
        did not write anything.
      */}
      <ul
        className={cn(
          'mt-10 grid items-stretch justify-center gap-6',
          visible.length === 1 && 'mx-auto max-w-xl',
          visible.length === 2 && 'mx-auto max-w-4xl sm:grid-cols-2',
          visible.length >= 3 && 'md:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {visible.map((testimonial, index) => (
          <Reveal as="li" key={testimonial.id} index={index} className="flex">
            <TestimonialCard testimonial={testimonial} />
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

/**
 * One published quote.
 *
 * <p>Composition, top to bottom: the author's real star rating, an oversized quotation mark set as
 * decoration, their own words at a comfortable reading size, then a ruled identity row carrying the
 * name, the derived role and the institution. The card is a flex column with the quote flexing, so
 * a short quote and a long one produce cards of equal height in the same row rather than a ragged
 * grid.
 *
 * <p>Hover changes border, shadow and surface only. Nothing moves: a card that lifts on hover moves
 * its own hit target, and this row sits on a page people scan with a mouse already in motion.
 *
 * <p>The rating row disappears entirely for a testimonial written before ratings existed. It is
 * never padded out to five stars, and no average is derived from the visible cards.
 */
function TestimonialCard({ testimonial }: { testimonial: PublicTestimonial }) {
  const { t } = useTranslation()
  const attribution = testimonialAttribution(t, testimonial)
  const platform = isPlatformRole(testimonial.authorRole)

  return (
    <figure className="group relative flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-7 transition-[color,background-color,border-color,box-shadow] duration-200 ease-out hover:border-border-strong hover:bg-surface-raised hover:shadow-md motion-reduce:transition-none">
      {/*
        Decorative quote mark. `aria-hidden` and positioned behind the text — a screen reader gets
        the <blockquote> semantics instead, and it is set low enough in contrast that it reads as
        texture rather than competing with the quote.
      */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-8 select-none font-display text-[8rem] leading-none text-brand-accent/10 transition-colors duration-200 group-hover:text-brand-accent/15 motion-reduce:transition-none"
      >
        &rdquo;
      </span>

      <StarRating value={testimonial.rating} size="md" className="relative" />

      <blockquote className="relative mt-5 flex-1 text-body-lg text-foreground">
        &ldquo;{testimonial.body}&rdquo;
      </blockquote>

      <figcaption className="relative mt-6 flex items-center gap-3 border-t border-border pt-5">
        {/*
          Initial rather than a photo: the public testimonial payload deliberately carries no avatar
          — it exposes only the attribution FursadHub is prepared to state. Inventing a face here
          would be fabricating an identity. Platform staff get the navy chip instead of the blue
          one, so an internal voice is visually distinct from a customer's at a glance.
        */}
        <span
          aria-hidden="true"
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold',
            platform
              ? 'bg-brand-navy text-white dark:bg-surface-raised dark:text-foreground'
              : 'bg-brand-blue-soft text-brand-blue',
          )}
        >
          {testimonial.authorDisplayName.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-body font-bold text-foreground">
            {testimonial.authorDisplayName}
          </span>
          {/*
            The full attribution: role first, institution second. `title` carries the untruncated
            string so a long institution name is still readable on a narrow card.
          */}
          <span className="mt-0.5 block truncate text-caption text-foreground-secondary" title={attribution}>
            {attribution}
          </span>
        </span>
        {platform && (
          // Said out loud as well as shown, so a FursadHub voice is never mistaken for a customer's.
          <span className="ml-auto shrink-0 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-caption font-bold uppercase tracking-wide text-foreground-secondary">
            {testimonialRoleLabel(t, testimonial)}
          </span>
        )}
      </figcaption>
    </figure>
  )
}
