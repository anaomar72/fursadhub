import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { StarRating, StarRatingInput } from '../../../src/components/ui'
import { TestimonialWall } from '../../../src/features/testimonials/components/TestimonialWall'
import { MyTestimonialPage } from '../../../src/features/testimonials/pages/MyTestimonialPage'
import * as testimonialApi from '../../../src/features/testimonials/api/testimonialApi'
import type { PublicTestimonial } from '../../../src/features/testimonials/types'
import i18n from '../../../src/lib/i18n'

vi.mock('../../../src/features/testimonials/api/testimonialApi')

function withQuery(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  )
}

const rated: PublicTestimonial = {
  id: 'rated',
  authorDisplayName: 'Amina H.',
  authorRole: 'STUDENT',
  authorAudience: 'STUDENT',
  authorAffiliation: 'Jamhuriya University',
  body: 'FursadHub matched me with an internship that actually used what I studied at university.',
  rating: 4,
}

/**
 * A row written before V51 added the rating column and before V52 derived roles. The API omits both
 * keys entirely (non_null inclusion), so the card has neither a score nor a role to render.
 */
const legacy: PublicTestimonial = {
  id: 'legacy',
  authorDisplayName: 'Yusuf A.',
  authorAudience: 'ORGANIZATION',
  authorAffiliation: null,
  body: 'We filled three internship openings without running our own separate campus process.',
}

describe('star rating input', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('is a real radio group, so it is operable with the keyboard alone', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <StarRatingInput value={null} onChange={onChange} label="Rate your FursadHub experience" />,
    )

    const group = screen.getByRole('group', { name: 'Rate your FursadHub experience' })
    expect(within(group).getAllByRole('radio')).toHaveLength(5)

    // Tab reaches the group as one stop, and an arrow key selects — no mouse involved.
    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalled()

    rerender(<StarRatingInput value={3} onChange={onChange} label="Rate your FursadHub experience" />)
    expect(screen.getByRole('radio', { name: '3 out of 5' })).toBeChecked()
  })

  it('selects on click and states the chosen rating in words', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <StarRatingInput value={null} onChange={onChange} label="Rate your FursadHub experience" />,
    )
    expect(screen.getByText('No rating selected yet')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: '5 out of 5' }))
    expect(onChange).toHaveBeenCalledWith(5)

    rerender(<StarRatingInput value={5} onChange={onChange} label="Rate your FursadHub experience" />)
    // Stated as visible text beneath the stars, so the selection never depends on noticing a
    // colour change. (The same sentence is also each radio's accessible name, hence getAllByText.)
    expect(screen.getAllByText('5 out of 5').length).toBeGreaterThan(0)
  })
})

describe('published testimonial rating display', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.clearAllMocks()
  })

  it('renders nothing at all when a testimonial has no rating', () => {
    const { container } = render(<StarRating value={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the author real rating on a published card', async () => {
    vi.mocked(testimonialApi.listPublishedTestimonials).mockResolvedValue([rated])
    withQuery(<TestimonialWall />)

    expect(await screen.findByText(/matched me with an internship/i)).toBeInTheDocument()
    expect(screen.getByText('4 out of 5')).toBeInTheDocument()
    // Never rounded up to a full five.
    expect(screen.queryByText('5 out of 5')).not.toBeInTheDocument()
  })

  it('renders a legacy unrated testimonial gracefully, with no invented stars', async () => {
    vi.mocked(testimonialApi.listPublishedTestimonials).mockResolvedValue([legacy])
    withQuery(<TestimonialWall />)

    expect(await screen.findByText(/filled three internship openings/i)).toBeInTheDocument()
    expect(screen.queryByText(/out of 5/i)).not.toBeInTheDocument()
  })

  it('shows no rating, and no section, when nothing has been published', async () => {
    vi.mocked(testimonialApi.listPublishedTestimonials).mockResolvedValue([])
    withQuery(<TestimonialWall />)

    await waitFor(() => expect(testimonialApi.listPublishedTestimonials).toHaveBeenCalled())
    expect(screen.queryByText('Awaiting approved testimonials')).not.toBeInTheDocument()
    expect(screen.queryByText(/out of 5/i)).not.toBeInTheDocument()
  })
})

describe('testimonial submission payload', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.clearAllMocks()
    vi.mocked(testimonialApi.listMyTestimonials).mockResolvedValue([])
    // The form is gated on the server-derived author context, so it has to resolve before the
    // rating control exists at all.
    vi.mocked(testimonialApi.getMyTestimonialContext).mockResolvedValue({
      eligible: true,
      authorRole: 'STUDENT',
      authorAudience: 'STUDENT',
      authorAffiliation: 'Jamhuriya University',
    })
  })

  function renderPage() {
    return render(
      <MemoryRouter>
        <AppProviders>
          <MyTestimonialPage />
        </AppProviders>
      </MemoryRouter>,
    )
  }

  it('refuses to submit without a rating and never invents one', async () => {
    renderPage()
    await userEvent.type(await screen.findByLabelText('Name to publish'), 'Amina H.')
    await userEvent.type(
      screen.getByLabelText('Your testimonial'),
      'A long enough testimonial body to satisfy the forty character minimum.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }))

    expect(await screen.findByText('Choose a rating between 1 and 5 stars.')).toBeInTheDocument()
    expect(testimonialApi.submitTestimonial).not.toHaveBeenCalled()
  })

  it('sends the rating the author actually chose', async () => {
    vi.mocked(testimonialApi.submitTestimonial).mockResolvedValue({
      ...rated,
      rating: 3,
      status: 'SUBMITTED',
      submittedAt: '2026-09-08T00:00:00Z',
      moderatedAt: null,
      moderationNote: null,
    })

    renderPage()
    await userEvent.type(await screen.findByLabelText('Name to publish'), 'Amina H.')
    await userEvent.type(
      screen.getByLabelText('Your testimonial'),
      'A long enough testimonial body to satisfy the forty character minimum.',
    )
    await userEvent.click(screen.getByRole('radio', { name: '3 out of 5' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }))

    // First argument only: TanStack Query passes its own mutation context as a second argument.
    expect(vi.mocked(testimonialApi.submitTestimonial).mock.calls[0][0]).toMatchObject({
      rating: 3,
      authorDisplayName: 'Amina H.',
    })
  })
})
