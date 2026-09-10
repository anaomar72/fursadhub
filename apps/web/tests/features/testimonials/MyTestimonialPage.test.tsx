import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MyTestimonialPage } from '../../../src/features/testimonials/pages/MyTestimonialPage'
import * as testimonialApi from '../../../src/features/testimonials/api/testimonialApi'
import type { Testimonial, TestimonialAuthorContext } from '../../../src/features/testimonials/types'
import '../../../src/lib/i18n'

vi.mock('../../../src/features/testimonials/api/testimonialApi', () => ({
  listMyTestimonials: vi.fn(),
  getMyTestimonialContext: vi.fn(),
  submitTestimonial: vi.fn(),
}))

function view() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <MyTestimonialPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** What the server says about the signed-in account. Never chosen in the browser. */
const STUDENT_CONTEXT: TestimonialAuthorContext = {
  eligible: true,
  authorRole: 'STUDENT',
  authorAudience: 'STUDENT',
  authorAffiliation: 'Jamhuriya University',
}

const submitted: Testimonial = {
  id: 't-1',
  authorDisplayName: 'Amina H.',
  authorRole: 'STUDENT',
  authorAudience: 'STUDENT',
  authorAffiliation: 'Jamhuriya University',
  rating: 5,
  body: 'A long enough testimonial body to satisfy the forty character minimum rule.',
  status: 'SUBMITTED',
  submittedAt: '2026-09-01T00:00:00Z',
  moderatedAt: null,
  moderationNote: null,
}

describe('my testimonial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(testimonialApi.getMyTestimonialContext).mockResolvedValue(STUDENT_CONTEXT)
  })

  it('states that submitting is not publishing', async () => {
    vi.mocked(testimonialApi.listMyTestimonials).mockResolvedValue([])
    view()
    expect(await screen.findByText(/Nothing appears on the public site until a moderator publishes it/))
      .toBeInTheDocument()
  })

  it('refuses to submit a body under the server minimum', async () => {
    vi.mocked(testimonialApi.listMyTestimonials).mockResolvedValue([])
    view()

    await userEvent.type(await screen.findByLabelText('Name to publish'), 'Amina H.')
    await userEvent.type(screen.getByLabelText('Your testimonial'), 'Too short.')
    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }))

    expect(await screen.findByText('Write at least 40 characters.')).toBeInTheDocument()
    expect(testimonialApi.submitTestimonial).not.toHaveBeenCalled()
  })

  it('maps the server error CODE to copy, never the raw English message', async () => {
    vi.mocked(testimonialApi.listMyTestimonials).mockResolvedValue([])
    const { ApiError } = await import('../../../src/lib/api/client')
    vi.mocked(testimonialApi.submitTestimonial).mockRejectedValue(
      new ApiError({
        code: 'TESTIMONIAL_ALREADY_SUBMITTED',
        message: 'raw backend text',
        status: 409,
        path: '/me/testimonial',
        timestamp: '',
        fieldErrors: [],
      }),
    )

    view()
    await userEvent.type(await screen.findByLabelText('Name to publish'), 'Amina H.')
    await userEvent.type(
      screen.getByLabelText('Your testimonial'),
      'A long enough testimonial body to satisfy the forty character minimum.',
    )
    // A rating is now required, so the form has to carry one before the request is even attempted.
    await userEvent.click(screen.getByRole('radio', { name: '4 out of 5' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }))

    expect(
      await screen.findByText('You already have a testimonial awaiting review or published.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('raw backend text')).not.toBeInTheDocument()
  })

  it('shows the real server status and hides the form while one is live', async () => {
    vi.mocked(testimonialApi.listMyTestimonials).mockResolvedValue([submitted])
    view()

    expect(await screen.findByText('Awaiting review')).toBeInTheDocument()
    // One live testimonial per author, matching the server's partial unique index.
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument()
  })

  it('lets a rejected author submit a replacement and shows the reviewer reason', async () => {
    vi.mocked(testimonialApi.listMyTestimonials).mockResolvedValue([
      { ...submitted, status: 'REJECTED', moderationNote: 'Could not confirm the placement' },
    ])
    view()

    expect(await screen.findByText('Not published')).toBeInTheDocument()
    expect(screen.getByText(/Could not confirm the placement/)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit for review' })).toBeInTheDocument(),
    )
  })
})

/*
 * The role is SHOWN, not asked. These are the tests that would fail if a role or an affiliation
 * field ever came back to this form -- which is exactly what made the pre-V52 defect possible.
 */
describe('my testimonial attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(testimonialApi.listMyTestimonials).mockResolvedValue([])
  })

  it('states the derived role back to the author and offers no control to change it', async () => {
    vi.mocked(testimonialApi.getMyTestimonialContext).mockResolvedValue({
      eligible: true,
      authorRole: 'RECRUITER',
      authorAudience: 'ORGANIZATION',
      authorAffiliation: 'Acme Ltd',
    })
    view()

    expect(await screen.findByText('You are sharing as')).toBeInTheDocument()
    expect(screen.getByText('Recruiter at Acme Ltd')).toBeInTheDocument()
    // Not a select, not a disabled select, not a text box: there is no role input of any kind.
    expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/organization|university|institution/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('sends only the name, rating and words, with no role and no affiliation', async () => {
    vi.mocked(testimonialApi.getMyTestimonialContext).mockResolvedValue({
      eligible: true,
      authorRole: 'RECRUITER',
      authorAudience: 'ORGANIZATION',
      authorAffiliation: 'Acme Ltd',
    })
    vi.mocked(testimonialApi.submitTestimonial).mockResolvedValue(submitted)
    view()

    await userEvent.type(await screen.findByLabelText('Name to publish'), 'Yusuf A.')
    await userEvent.type(
      screen.getByLabelText('Your testimonial'),
      'A long enough testimonial body to satisfy the forty character minimum.',
    )
    await userEvent.click(screen.getByRole('radio', { name: '5 out of 5' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }))

    await waitFor(() => expect(testimonialApi.submitTestimonial).toHaveBeenCalled())
    const payload = vi.mocked(testimonialApi.submitTestimonial).mock.calls[0][0]
    expect(Object.keys(payload).sort()).toEqual(['authorDisplayName', 'body', 'rating'])
  })

  it('explains why the form is unavailable to an account with no attributable role', async () => {
    vi.mocked(testimonialApi.getMyTestimonialContext).mockResolvedValue({ eligible: false })
    view()

    expect(await screen.findByText('Not available yet')).toBeInTheDocument()
    expect(screen.getByText(/Stories are published under a real FursadHub role/)).toBeInTheDocument()
    // The server refuses this case anyway; the page must not offer a form that cannot succeed.
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument()
  })
})
