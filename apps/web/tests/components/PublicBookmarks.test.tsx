import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PublicBookmarks, PublicBookmark } from '../../src/features/student/components/PublicBookmarks'
import { useStudentMarketplaceAccess } from '../../src/features/student/hooks/useStudentMarketplaceAccess'
import { useSavedOpportunityStatus } from '../../src/features/student/hooks/useSavedOpportunities'
import '../../src/lib/i18n'
vi.mock('../../src/features/student/hooks/useStudentMarketplaceAccess', () => ({ useStudentMarketplaceAccess: vi.fn() }))
vi.mock('../../src/features/student/hooks/useSavedOpportunities', async (original) => ({ ...await original<object>(), useSavedOpportunityStatus: vi.fn() }))

function view(authenticated: boolean, canAct: boolean, isLoading = false) {
  vi.mocked(useStudentMarketplaceAccess).mockReturnValue({ isAuthenticated: authenticated, canAct, isLoading })
  vi.mocked(useSavedOpportunityStatus).mockReturnValue({ isSaved: () => false, isLoading: false, isUnavailable: false })
  return render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><PublicBookmarks ids={['opportunity']}><PublicBookmark id="opportunity" inline /></PublicBookmarks></MemoryRouter></QueryClientProvider>)
}
describe('public Student-only bookmarks', () => {
  it('offers anonymous visitors sign in without querying their saved list', () => {
    view(false, false)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/login')
    expect(useSavedOpportunityStatus).toHaveBeenLastCalledWith(['opportunity'], { enabled: false })
  })
  it('offers Student bookmarks after database authority is confirmed', () => {
    view(true, true)
    expect(screen.getByRole('button')).toBeEnabled()
  })
  it.each([false, true])('shows no Student mutation while denied or loading (%s)', (isLoading) => {
    view(true, false, isLoading)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(useSavedOpportunityStatus).toHaveBeenLastCalledWith(['opportunity'], { enabled: false })
  })
})
