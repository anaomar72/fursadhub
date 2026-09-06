import { describe, expect, it } from 'vitest'
import {
  buildOrganizationProfilePayload,
  toOrganizationFormValues,
} from '../../../src/features/organization/organizationProfilePayload'
import { buildUniversityProfilePayload, toUniversityFormValues } from '../../../src/features/university/universityProfilePayload'
import type { OrganizationResponse } from '../../../src/features/organization/types'
import type { UniversityDetailResponse } from '../../../src/features/university/types'

function organization(overrides: Partial<OrganizationResponse> = {}): OrganizationResponse {
  return {
    id: 'org-1',
    name: 'TechSolutions',
    slug: 'techsolutions',
    type: 'COMPANY',
    registrationNumber: 'REG-1',
    website: 'https://techsolutions.example',
    description: 'We build things.',
    industry: 'Technology',
    city: 'Mogadishu',
    countryCode: 'SO',
    shortDescription: 'Somali software studio',
    companySizeRange: 'SIZE_11_50',
    foundedYear: 2019,
    linkedinUrl: 'https://linkedin.com/company/tech',
    xUrl: null,
    instagramUrl: null,
    youtubeUrl: null,
    hasCover: false,
    coverUploadedAt: null,
    verificationStatus: 'VERIFIED',
    verifiedAt: '2026-01-01T00:00:00Z',
    hasEvidence: true,
    evidenceUploadedAt: '2026-01-01T00:00:00Z',
    hasLogo: true,
    logoUploadedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function university(overrides: Partial<UniversityDetailResponse> = {}): UniversityDetailResponse {
  return {
    id: 'uni-1',
    name: 'Jamhuriya University',
    slug: 'jamhuriya',
    city: 'Mogadishu',
    countryCode: 'SO',
    publicContactEmail: 'careers@jamhuriya.example',
    hasCover: false,
    coverUploadedAt: null,
    registrationNumber: 'REG-9',
    website: 'https://jamhuriya.example',
    description: 'A university.',
    status: 'VERIFIED',
    hasEvidence: true,
    evidenceUploadedAt: '2026-01-01T00:00:00Z',
    hasLogo: true,
    logoUploadedAt: '2026-01-01T00:00:00Z',
    verifiedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as UniversityDetailResponse
}

describe('Backend Phase B2 organization profile payload', () => {
  it('prefills the form from every stored field', () => {
    const values = toOrganizationFormValues(organization())

    expect(values).toMatchObject({
      name: 'TechSolutions',
      industry: 'Technology',
      city: 'Mogadishu',
      countryCode: 'SO',
      shortDescription: 'Somali software studio',
      companySizeRange: 'SIZE_11_50',
      foundedYear: 2019,
      linkedinUrl: 'https://linkedin.com/company/tech',
    })
  })

  it('prefills an unset optional field as an empty control, not undefined', () => {
    const values = toOrganizationFormValues(organization({ industry: undefined, foundedYear: undefined }))

    expect(values.industry).toBe('')
    expect(values.foundedYear).toBe('')
  })

  /**
   * The failure this exists to prevent: an untouched optional field serialized as `null`. Under the
   * presence-aware contract that is an explicit CLEAR, so it would erase data the admin never
   * opened — exactly the loss `PatchField` was added to stop, reproduced from the client side.
   */
  describe('untouched fields', () => {
    it('omits every presence-aware field when nothing changed', () => {
      const stored = organization()
      const payload = buildOrganizationProfilePayload(toOrganizationFormValues(stored), stored)

      for (const key of [
        'industry',
        'city',
        'countryCode',
        'shortDescription',
        'companySizeRange',
        'foundedYear',
        'linkedinUrl',
        'xUrl',
        'instagramUrl',
        'youtubeUrl',
      ]) {
        expect(payload, `${key} must be omitted, not sent as null`).not.toHaveProperty(key)
      }
    })

    it('never serializes an untouched field as null in the JSON body', () => {
      const stored = organization()
      const body = JSON.stringify(buildOrganizationProfilePayload(toOrganizationFormValues(stored), stored))

      expect(body).not.toContain('"industry"')
      expect(body).not.toContain('"companySizeRange"')
      expect(body).not.toContain('"foundedYear"')
    })

    it('treats a re-typed country code of different case as unchanged', () => {
      const stored = organization({ countryCode: 'SO' })
      const values = { ...toOrganizationFormValues(stored), countryCode: 'so' }

      expect(buildOrganizationProfilePayload(values, stored)).not.toHaveProperty('countryCode')
    })

    it('leaves an already-empty optional field out entirely', () => {
      const stored = organization({ xUrl: null })
      const payload = buildOrganizationProfilePayload(toOrganizationFormValues(stored), stored)

      expect(payload).not.toHaveProperty('xUrl')
    })
  })

  describe('changed fields', () => {
    it('sends a new value', () => {
      const stored = organization()
      const values = { ...toOrganizationFormValues(stored), industry: 'Fintech' }

      expect(buildOrganizationProfilePayload(values, stored).industry).toBe('Fintech')
    })

    it('upper-cases a country code on the wire', () => {
      const stored = organization({ countryCode: 'SO' })
      const values = { ...toOrganizationFormValues(stored), countryCode: 'ke' }

      expect(buildOrganizationProfilePayload(values, stored).countryCode).toBe('KE')
    })

    it('sends a changed enum and a changed number', () => {
      const stored = organization()
      const values = {
        ...toOrganizationFormValues(stored),
        companySizeRange: 'SIZE_201_500' as const,
        foundedYear: 2020,
      }
      const payload = buildOrganizationProfilePayload(values, stored)

      expect(payload.companySizeRange).toBe('SIZE_201_500')
      expect(payload.foundedYear).toBe(2020)
    })
  })

  describe('explicitly cleared fields', () => {
    it('sends a real null for a text field the admin emptied', () => {
      const stored = organization({ industry: 'Technology' })
      const values = { ...toOrganizationFormValues(stored), industry: '' }
      const payload = buildOrganizationProfilePayload(values, stored)

      expect(payload).toHaveProperty('industry')
      expect(payload.industry).toBeNull()
    })

    it('sends a real null for a cleared enum and a cleared number', () => {
      const stored = organization({ companySizeRange: 'SIZE_11_50', foundedYear: 2019 })
      const values = { ...toOrganizationFormValues(stored), companySizeRange: '' as const, foundedYear: '' as const }
      const payload = buildOrganizationProfilePayload(values, stored)

      expect(payload.companySizeRange).toBeNull()
      expect(payload.foundedYear).toBeNull()
    })

    it('sends a real null for a removed social link', () => {
      const stored = organization({ linkedinUrl: 'https://linkedin.com/company/tech' })
      const values = { ...toOrganizationFormValues(stored), linkedinUrl: '' }

      expect(buildOrganizationProfilePayload(values, stored).linkedinUrl).toBeNull()
    })
  })

  describe('full-replacement fields', () => {
    /** Omitting one of these still CLEARS it server-side, so all four are always present. */
    it('always sends the four original fields', () => {
      const stored = organization()
      const payload = buildOrganizationProfilePayload(toOrganizationFormValues(stored), stored)

      expect(payload.name).toBe('TechSolutions')
      expect(payload.registrationNumber).toBe('REG-1')
      expect(payload.website).toBe('https://techsolutions.example')
      expect(payload.description).toBe('We build things.')
    })
  })
})

describe('Backend Phase B2 university profile payload', () => {
  it('prefills countryCode and publicContactEmail from the record', () => {
    const values = toUniversityFormValues(university())

    expect(values.countryCode).toBe('SO')
    expect(values.publicContactEmail).toBe('careers@jamhuriya.example')
  })

  it('omits both presence-aware fields when nothing changed', () => {
    const stored = university()
    const payload = buildUniversityProfilePayload(toUniversityFormValues(stored), stored)

    expect(payload).not.toHaveProperty('countryCode')
    expect(payload).not.toHaveProperty('publicContactEmail')
  })

  it('sends a real null for a cleared public contact email', () => {
    const stored = university()
    const values = { ...toUniversityFormValues(stored), publicContactEmail: '' }
    const payload = buildUniversityProfilePayload(values, stored)

    expect(payload).toHaveProperty('publicContactEmail')
    expect(payload.publicContactEmail).toBeNull()
  })

  it('sends a changed public contact email', () => {
    const stored = university()
    const values = { ...toUniversityFormValues(stored), publicContactEmail: 'internships@jamhuriya.example' }

    expect(buildUniversityProfilePayload(values, stored).publicContactEmail).toBe('internships@jamhuriya.example')
  })

  it('always sends the five full-replacement fields', () => {
    const stored = university()
    const payload = buildUniversityProfilePayload(toUniversityFormValues(stored), stored)

    expect(payload.name).toBe('Jamhuriya University')
    expect(payload.city).toBe('Mogadishu')
    expect(payload.registrationNumber).toBe('REG-9')
    expect(payload.website).toBe('https://jamhuriya.example')
    expect(payload.description).toBe('A university.')
  })
})
