import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TestimonialWall } from '../../../src/features/testimonials/components/TestimonialWall'
import { listPublishedTestimonials } from '../../../src/features/testimonials/api/testimonialApi'
import type { PublicTestimonial } from '../../../src/features/testimonials/types'
import '../../../src/lib/i18n'

vi.mock('../../../src/features/testimonials/api/testimonialApi', () => ({
  listPublishedTestimonials: vi.fn(),
}))

function view() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TestimonialWall />
    </QueryClientProvider>,
  )
}

const PUBLISHED: PublicTestimonial = {
  id: 'testimonial-1',
  authorDisplayName: 'Amina H.',
  authorRole: 'STUDENT',
  authorAudience: 'STUDENT',
  authorAffiliation: 'Jamhuriya University',
  body: 'FursadHub matched me with an internship that used what I studied.',
}

describe('public testimonial wall', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders only what the published endpoint returned', async () => {
    vi.mocked(listPublishedTestimonials).mockResolvedValue([PUBLISHED])
    view()
    expect(await screen.findByText(/FursadHub matched me/)).toBeInTheDocument()
    expect(screen.getByText('Amina H.')).toBeInTheDocument()
    expect(screen.getByText(/Jamhuriya University/)).toBeInTheDocument()
    // No placeholder people alongside real ones.
    expect(screen.queryByText('Awaiting approved testimonials')).not.toBeInTheDocument()
  })

  /*
   * Nothing published, nothing shown — not even the heading. The section used to render three
   * "Awaiting approved testimonials" placeholders, which told a first-time visitor that nobody had
   * anything to say yet.
   */
  it('renders nothing at all — no placeholders, no heading — when none are published', async () => {
    vi.mocked(listPublishedTestimonials).mockResolvedValue([])
    const { container } = view()
    await waitFor(() => expect(listPublishedTestimonials).toHaveBeenCalled())
    await waitFor(() => expect(container).toBeEmptyDOMElement())
    expect(screen.queryByText('Awaiting approved testimonials')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('does not invent quotes, or a placeholder section, when the request fails', async () => {
    vi.mocked(listPublishedTestimonials).mockRejectedValue(new Error('offline'))
    const { container } = view()
    // An unreachable API is not evidence that anyone said anything.
    await waitFor(() => expect(listPublishedTestimonials).toHaveBeenCalled())
    await waitFor(() => expect(container).toBeEmptyDOMElement())
    expect(screen.queryByRole('blockquote')).not.toBeInTheDocument()
  })
})

/*
 * The defect V52 exists to close: attribution used to be the author's own choice, so a recruiter
 * could sign a quote "Student · Jamhuriya University". These assert the replacement rule — the
 * server-derived role is printed exactly, and is never softened into the broader audience wording
 * when the precise role is known.
 */
describe('published attribution is the server derived role', () => {
  beforeEach(() => vi.clearAllMocks())

  it('prints a recruiter as Recruiter at their organization, never as Student', async () => {
    vi.mocked(listPublishedTestimonials).mockResolvedValue([
      {
        id: 'recruiter-1',
        authorDisplayName: 'Yusuf A.',
        authorRole: 'RECRUITER',
        authorAudience: 'ORGANIZATION',
        authorAffiliation: 'Acme Ltd',
        body: 'We filled three internship openings without running our own campus process.',
      },
    ])
    view()

    expect(await screen.findByText('Recruiter at Acme Ltd')).toBeInTheDocument()
    // Not the author's self-description, and not the vaguer audience word either.
    expect(screen.queryByText(/Student/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Organization$/)).not.toBeInTheDocument()
  })

  it('names a department coordinator by their real role, not by their university', async () => {
    vi.mocked(listPublishedTestimonials).mockResolvedValue([
      {
        id: 'coordinator-1',
        authorDisplayName: 'Fadumo I.',
        authorRole: 'DEPARTMENT_COORDINATOR',
        authorAudience: 'UNIVERSITY',
        authorAffiliation: 'Jamhuriya University',
        body: 'Nominating our IT students takes minutes instead of a week of email threads.',
      },
    ])
    view()

    expect(await screen.findByText('Department Coordinator at Jamhuriya University')).toBeInTheDocument()
  })

  it('marks a FursadHub staff quote as the platform own, carrying no tenant', async () => {
    vi.mocked(listPublishedTestimonials).mockResolvedValue([
      {
        id: 'platform-1',
        authorDisplayName: 'Hodan M.',
        authorRole: 'VERIFICATION_OFFICER',
        authorAudience: 'PLATFORM',
        authorAffiliation: null,
        body: 'Verification evidence now arrives in one queue instead of five inboxes.',
      },
    ])
    view()

    // Read out loud as FursadHub's, so an internal voice cannot be mistaken for a customer's.
    expect(await screen.findByText('Verification Officer, FursadHub')).toBeInTheDocument()
    expect(screen.getAllByText('Verification Officer').length).toBeGreaterThan(0)
  })

  it('falls back to the audience wording for a row written before roles were derived', async () => {
    vi.mocked(listPublishedTestimonials).mockResolvedValue([
      {
        id: 'legacy-1',
        authorDisplayName: 'Cabdi S.',
        // V52 backfills nothing: the API reports no role for a pre-derivation row.
        authorAudience: 'ORGANIZATION',
        authorAffiliation: null,
        body: 'We used FursadHub for our first cohort and kept using it for the second.',
      },
    ])
    view()

    // The broad word is reached only here — where no precise role was ever verified — and no job
    // title is invented to fill the gap.
    expect(await screen.findByText('Organization')).toBeInTheDocument()
  })
})
