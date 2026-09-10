import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentProfilePage } from '../../../src/features/student/pages/ProfilePage'
import i18n from '../../../src/lib/i18n'

describe('student professional profile editor', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  it('keeps unsaved typing and focus when the saved profile refreshes', async () => {
    const profile = { userId: 'student', fullName: 'Student Name', phone: null, professional: { headline: 'Developer', summary: 'Learning software engineering.', skills: ['React'] } }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input)
      const body = path.endsWith('/students/me/profile') ? profile : path.endsWith('/auth/me') ? { id: 'student', email: 'student@example.test', hasAvatar: false } : null
      return Promise.resolve(new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }))
    }))
    render(<MemoryRouter><QueryClientProvider client={client}><StudentProfilePage /></QueryClientProvider></MemoryRouter>)
    const field = await screen.findByLabelText('Professional headline')
    await userEvent.clear(field)
    await userEvent.type(field, 'Unsaved new headline')
    await act(async () => { client.setQueryData(['student', 'profile'], { ...profile, fullName: 'Updated server name' }) })
    expect(field).toHaveValue('Unsaved new headline')
    expect(field).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Your CV' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('University')).not.toBeInTheDocument()
  })
})
