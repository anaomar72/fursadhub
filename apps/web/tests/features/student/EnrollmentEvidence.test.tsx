import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { EnrollmentPage } from '../../../src/features/student/pages/EnrollmentPage'
import i18n from '../../../src/lib/i18n'

describe('enrollment evidence and submission cache', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  it('enables submission after upload and displays submitted state without a reload', async () => {
    let evidence = false
    let status = 'DRAFT'
    const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }))
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path.endsWith('/auth/refresh')) return json({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 600 })
      if (path.endsWith('/students/me/enrollment')) return json({ id: 'enrollment', universityId: 'university', departmentId: 'department', studentNumber: 'S1', program: 'Computing', academicYear: '2026', verificationStatus: status, hasDraftEvidence: evidence && status === 'DRAFT' })
      if (path.endsWith('/students/me/verification/evidence') && init?.method === 'POST') {
        expect(init.body).toBeInstanceOf(FormData)
        evidence = true
        return json({ present: true })
      }
      if (path.endsWith('/students/me/enrollment/submit-verification') && init?.method === 'POST') {
        expect(evidence).toBe(true)
        status = 'SUBMITTED'
        return json({ id: 'case', status, hasEvidence: true })
      }
      if (path.endsWith('/students/me/verification')) return json({ id: 'case', status, hasEvidence: evidence })
      throw new Error(`Unexpected request: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter><AppProviders><EnrollmentPage /></AppProviders></MemoryRouter>)
    const submit = await screen.findByRole('button', { name: /submit for verification/i })
    expect(submit).toBeDisabled()
    await userEvent.upload(screen.getByLabelText(/verification evidence/i), new File(['%PDF-1.7 ID'], 'student-id.pdf', { type: 'application/pdf' }))
    await waitFor(() => expect(submit).toBeEnabled())
    await userEvent.click(submit)
    expect(await screen.findByText('Submitted')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit for verification/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/submit enrollment for verification first/i)).not.toBeInTheDocument()
  })
})
