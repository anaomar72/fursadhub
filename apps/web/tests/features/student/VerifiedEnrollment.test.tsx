import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VerifiedEnrollment } from '../../../src/features/student/components/VerifiedEnrollment'
import type { StudentEnrollmentResponse } from '../../../src/features/student/types'
import '../../../src/lib/i18n'

vi.mock('../../../src/features/university/api/universityApi', () => ({
  getPublicUniversity: vi.fn(),
  listDepartments: vi.fn(),
}))

const enrollment: StudentEnrollmentResponse = {
  id: 'enr-1',
  universityId: 'uni-1',
  departmentId: 'dep-1',
  studentNumber: 'ATU-2026-001',
  program: 'BSc Information Technology',
  academicYear: '2026',
  verificationStatus: 'VERIFIED',
  hasDraftEvidence: false,
}

function view() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <VerifiedEnrollment enrollment={enrollment} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('verified enrollment', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const api = await import('../../../src/features/university/api/universityApi')
    vi.mocked(api.getPublicUniversity).mockResolvedValue({ id: 'uni-1', name: 'Jamhuriya University' } as never)
    vi.mocked(api.listDepartments).mockResolvedValue([
      { id: 'dep-1', name: 'Information Technology', code: 'IT' },
      { id: 'dep-2', name: 'Medicine', code: 'MED' },
    ] as never)
  })

  it('leads with the outcome rather than with a form', async () => {
    view()
    expect(
      await screen.findByRole('heading', { name: /your university has verified your enrollment/i }),
    ).toBeInTheDocument()
  })

  /*
   * The defect this replaces: the page stayed a submission screen with a tick appended, so nothing
   * told the student they were finished. Offering "upload evidence" or "resubmit" to someone whose
   * enrollment is already verified is worse than useless — it implies something is still wrong.
   */
  it('offers no submission action, because there is nothing left to submit', async () => {
    view()
    await screen.findByRole('heading', { name: /verified your enrollment/i })

    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /resubmit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument()
  })

  it('names the real university and department, resolved from the ids the enrollment carries', async () => {
    view()
    expect(await screen.findByText('Jamhuriya University')).toBeInTheDocument()
    expect(screen.getByText('Information Technology')).toBeInTheDocument()
    // The other department in the same university must not leak into the summary.
    expect(screen.queryByText('Medicine')).not.toBeInTheDocument()
    expect(screen.getByText('BSc Information Technology')).toBeInTheDocument()
    expect(screen.getByText('ATU-2026-001')).toBeInTheDocument()
  })

  it('claims only enrollment verification, never account or institution verification', async () => {
    view()
    const body = (await screen.findByText(/apply to internships and be nominated/i)).textContent ?? ''
    expect(body).toMatch(/separate from your account and from institution verification/i)
  })

  it('shows the four workflow points as complete', async () => {
    view()
    await screen.findByRole('heading', { name: /verified your enrollment/i })
    const steps = screen.getAllByRole('listitem')
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(screen.getByText(/your university confirmed your enrollment/i)).toBeInTheDocument()
  })

  it('points at existing routes only', async () => {
    view()
    expect(await screen.findByRole('link', { name: /browse internships/i })).toHaveAttribute(
      'href',
      '/student/opportunities',
    )
    expect(screen.getByRole('link', { name: /complete your profile/i })).toHaveAttribute(
      'href',
      '/student/profile',
    )
  })

  it('omits a fact the backend did not supply rather than inventing one', async () => {
    const api = await import('../../../src/features/university/api/universityApi')
    // The university lookup fails — the row is dropped, not filled with a placeholder.
    vi.mocked(api.getPublicUniversity).mockRejectedValue(new Error('offline'))
    view()

    await screen.findByRole('heading', { name: /verified your enrollment/i })
    expect(screen.queryByText('Jamhuriya University')).not.toBeInTheDocument()
    // The whole row is dropped — no "University" label sitting over a dash or an empty value.
    expect(screen.queryByText('University')).not.toBeInTheDocument()
    // The rest of the summary still renders from data the enrollment itself carries.
    expect(screen.getByText('ATU-2026-001')).toBeInTheDocument()
    expect(screen.getByText('BSc Information Technology')).toBeInTheDocument()
  })
})
