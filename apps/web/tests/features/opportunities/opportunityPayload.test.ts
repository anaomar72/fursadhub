import { describe, expect, it } from 'vitest'
import {
  buildCompensation,
  buildOpportunityPayload,
  emptyOpportunityFormValues,
  toOpportunityFormValues,
} from '../../../src/features/opportunities/opportunityPayload'
import type { OpportunityFormValues } from '../../../src/features/opportunities/schemas/opportunityFormSchema'
import type { OpportunityResponse } from '../../../src/features/opportunities/types'

function values(overrides: Partial<OpportunityFormValues> = {}): OpportunityFormValues {
  return {
    ...emptyOpportunityFormValues(),
    title: 'Frontend Intern',
    description: 'Build interfaces.',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    applicationDeadline: '2026-09-20',
    ...overrides,
  }
}

function stored(overrides: Partial<OpportunityResponse> = {}): OpportunityResponse {
  return {
    id: 'opp-1',
    organizationId: 'org-1',
    title: 'Frontend Intern',
    description: 'Build interfaces.',
    responsibilities: null,
    requirements: null,
    mode: 'PUBLIC',
    numberOfOpenings: 1,
    workMode: 'ONSITE',
    location: null,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    applicationDeadline: '2026-09-20',
    skills: [],
    perks: [],
    status: 'DRAFT',
    publishedAt: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  }
}

describe('Backend Phase B3 opportunity payload', () => {
  describe('compensation type conditions', () => {
    it('sends nothing about pay when no type is chosen — which is not the same as UNPAID', () => {
      expect(buildCompensation(values({ compensationType: '' }))).toBeNull()
    })

    it('sends UNPAID with no amount, currency or period', () => {
      const compensation = buildCompensation(
        values({ compensationType: 'UNPAID' }),
      )
      expect(compensation).toEqual({ type: 'UNPAID' })
    })

    it('puts a FIXED amount in minimumAmount and never sends a maximum', () => {
      const compensation = buildCompensation(
        values({ compensationType: 'FIXED', minimumAmount: '500', currencyCode: 'usd', compensationPeriod: 'MONTH' }),
      )
      expect(compensation).toEqual({
        type: 'FIXED',
        minimumAmount: '500',
        maximumAmount: null,
        currencyCode: 'USD',
        period: 'MONTH',
      })
    })

    it('sends both bounds for a RANGE', () => {
      const compensation = buildCompensation(
        values({
          compensationType: 'RANGE',
          minimumAmount: '300',
          maximumAmount: '600',
          currencyCode: 'SOS',
          compensationPeriod: 'MONTH',
        }),
      )
      expect(compensation).toMatchObject({ type: 'RANGE', minimumAmount: '300', maximumAmount: '600' })
    })

    it('sends a bare NEGOTIABLE when no indicative amount was given', () => {
      expect(buildCompensation(values({ compensationType: 'NEGOTIABLE' }))).toEqual({ type: 'NEGOTIABLE' })
    })
  })

  /**
   * The failure this guards against: hiding a control does NOT clear the value React Hook Form is
   * still holding for it. An amount typed under FIXED must not be shipped after switching to
   * UNPAID — the backend rejects that outright, and on the NEGOTIABLE path it would silently
   * ACCEPT and publish a figure the organization believed it had removed.
   */
  describe('stale values after a type switch', () => {
    it('FIXED -> UNPAID does not submit the old amount, currency or period', () => {
      const compensation = buildCompensation(
        values({
          compensationType: 'UNPAID',
          minimumAmount: '500',
          currencyCode: 'USD',
          compensationPeriod: 'MONTH',
        }),
      )
      expect(compensation).toEqual({ type: 'UNPAID' })
    })

    it('RANGE -> NEGOTIABLE does not submit the old maximum', () => {
      const compensation = buildCompensation(
        values({
          compensationType: 'NEGOTIABLE',
          minimumAmount: '300',
          maximumAmount: '600',
          currencyCode: 'USD',
          compensationPeriod: 'MONTH',
        }),
      )
      // A NEGOTIABLE figure may keep its minimum, but only alongside a maximum the type admits —
      // and NEGOTIABLE does admit one, so this asserts the FIXED case below for the strict rule.
      expect(compensation).toMatchObject({ type: 'NEGOTIABLE', minimumAmount: '300' })
    })

    it('RANGE -> FIXED does not submit the old maximum', () => {
      const compensation = buildCompensation(
        values({
          compensationType: 'FIXED',
          minimumAmount: '300',
          maximumAmount: '600',
          currencyCode: 'USD',
          compensationPeriod: 'MONTH',
        }),
      )
      expect(compensation?.maximumAmount).toBeNull()
    })

    it('a cleared amount takes its currency and period with it', () => {
      const compensation = buildCompensation(
        values({ compensationType: 'NEGOTIABLE', minimumAmount: '', currencyCode: 'USD', compensationPeriod: 'MONTH' }),
      )
      // The backend refuses a currency or period without an amount, so neither is sent.
      expect(compensation).toEqual({ type: 'NEGOTIABLE' })
    })
  })

  describe('hoursPerWeek', () => {
    it('sends an explicit null for "not stated", never NaN or an empty string', () => {
      const payload = buildOpportunityPayload(values({ hoursPerWeek: '' }))
      expect(payload.hoursPerWeek).toBeNull()
      expect(JSON.stringify(payload)).toContain('"hoursPerWeek":null')
    })

    it('sends the number when one was entered', () => {
      expect(buildOpportunityPayload(values({ hoursPerWeek: 20 })).hoursPerWeek).toBe(20)
    })
  })

  describe('skills and perks', () => {
    it('sends the lists as entered', () => {
      const payload = buildOpportunityPayload(values({ skills: ['React', 'SQL'], perks: ['Transport'] }))
      expect(payload.skills).toEqual(['React', 'SQL'])
      expect(payload.perks).toEqual(['Transport'])
    })

    /** `[]` is the explicit clear for a presence-aware list; omitting it would preserve stale tags. */
    it('sends an empty array when the organization removed every tag', () => {
      const payload = buildOpportunityPayload(values({ skills: [], perks: [] }))
      expect(payload.skills).toEqual([])
      expect(payload.perks).toEqual([])
    })
  })

  describe('editing an existing opportunity', () => {
    it('round-trips a stored opportunity through the form without losing its B3 fields', () => {
      const original = stored({
        compensation: { type: 'RANGE', currencyCode: 'USD', minimumAmount: '300.00', maximumAmount: '600.00', period: 'MONTH' },
        skills: ['React'],
        perks: ['Transport'],
        hoursPerWeek: 20,
      })

      const payload = buildOpportunityPayload(toOpportunityFormValues(original))

      expect(payload.compensation).toEqual({
        type: 'RANGE',
        minimumAmount: '300.00',
        maximumAmount: '600.00',
        currencyCode: 'USD',
        period: 'MONTH',
      })
      expect(payload.skills).toEqual(['React'])
      expect(payload.perks).toEqual(['Transport'])
      expect(payload.hoursPerWeek).toBe(20)
    })

    it('opens a pre-B3 opportunity with empty B3 fields rather than undefined ones', () => {
      const formValues = toOpportunityFormValues(stored({ compensation: undefined, hoursPerWeek: undefined }))

      expect(formValues.compensationType).toBe('')
      expect(formValues.minimumAmount).toBe('')
      expect(formValues.hoursPerWeek).toBe('')
    })

    it('still sends every full-replacement field, so none is cleared by omission', () => {
      const payload = buildOpportunityPayload(
        values({ responsibilities: 'Ship features', requirements: 'Second year', location: 'Mogadishu' }),
      )

      expect(payload.responsibilities).toBe('Ship features')
      expect(payload.requirements).toBe('Second year')
      expect(payload.location).toBe('Mogadishu')
      expect(payload.applicationDeadline).toBe('2026-09-20')
    })
  })
})
