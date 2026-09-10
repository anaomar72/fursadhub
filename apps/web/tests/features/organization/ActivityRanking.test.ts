import { describe, expect, it, vi } from 'vitest'
import { listMostActivePublicOrganizations } from '../../../src/features/organization/api/organizationApi'

describe('home organization activity ranking', () => {
  it('includes an active organization on a later directory page', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const second = String(input).includes('page=1')
      return Promise.resolve(new Response(JSON.stringify({ content: second ? [{ id: 'active', name: 'Zulu', openOpportunityCount: 12 }] : [{ id: 'older', name: 'Alpha', openOpportunityCount: 1 }], page: second ? 1 : 0, totalPages: 2, totalElements: 101 }), { headers: { 'Content-Type': 'application/json' } }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await listMostActivePublicOrganizations(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.content.map(row => row.id)).toEqual(['active'])
    expect(result.totalElements).toBe(101)
  })
})
