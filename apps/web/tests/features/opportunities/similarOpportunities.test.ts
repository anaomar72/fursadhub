import { describe, expect, it } from 'vitest'
import { similarOpportunities } from '../../../src/features/opportunities/similarOpportunities'
import type { PublicOpportunityResponse } from '../../../src/features/opportunities/types'

const current = { id: 'current', organization: { id: 'org' }, workMode: 'REMOTE', location: 'Mogadishu', skills: ['React'] } as PublicOpportunityResponse
const candidate = (id: string, overrides: Partial<PublicOpportunityResponse> = {}) => ({ ...current, id, ...overrides })
describe('real-field internship similarity', () => {
  it('excludes itself, expired opportunities and candidates matching only work mode', () => {
    const unrelated = candidate('unrelated', { organization: { id: 'other' } as PublicOpportunityResponse['organization'], location: 'Other city', skills: [] })
    expect(similarOpportunities(current, [current, candidate('expired', { applicationDeadline: '2026-09-01' }), unrelated], '2026-09-07')).toEqual([])
  })
  it('ranks actual shared fields, uses stable ties and includes the deadline day', () => {
    const candidates = ['d', 'c', 'b', 'a'].map(id => candidate(id, { applicationDeadline: '2026-09-07' }))
    expect(similarOpportunities(current, candidates, '2026-09-07').map(row => row.id)).toEqual(['a', 'b', 'c'])
    expect(similarOpportunities(current, [...candidates].reverse(), '2026-09-07')).toEqual(similarOpportunities(current, candidates, '2026-09-07'))
  })
})
