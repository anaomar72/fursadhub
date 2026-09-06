import { ABSENT, compactPatch, patchEnum, patchNumber, patchText } from '../../lib/validation/patchField'
import type { UpdateOrganizationFormValues } from './schemas/organizationProfileSchema'
import type { CompanySizeRange, OrganizationResponse } from './types'

/**
 * Builds the `PATCH /organizations/{id}` body from the form and the record it was loaded from.
 *
 * <p>**Two update semantics in one request**, because the API has two (see
 * `UpdateOrganizationRequest`):
 *
 * <ul>
 *   <li>The four ORIGINAL fields — name, registrationNumber, website, description — are FULL
 *       REPLACEMENT. Omitting one CLEARS it, so all four are always sent, with an emptied field
 *       sent as `undefined` (which JSON.stringify drops) to clear it deliberately.</li>
 *   <li>The ten B2 fields are PRESENCE-AWARE. Each is resolved against the stored value: untouched
 *       is omitted, emptied is an explicit `null`, changed is the new value.</li>
 * </ul>
 *
 * <p>The rule this exists to enforce is the one from Phase D section 16: an untouched optional field
 * must NOT be serialized as `null`. Sending `{industry: null}` for a field the admin never opened
 * would erase it — which is exactly the failure `PatchField` was added to prevent, reproduced from
 * the client side.
 */
export function buildOrganizationProfilePayload(
  values: UpdateOrganizationFormValues,
  stored: OrganizationResponse,
) {
  return {
    // Full replacement — always present.
    name: values.name,
    registrationNumber: values.registrationNumber || undefined,
    website: values.website || undefined,
    description: values.description || undefined,

    // Presence-aware — omitted when unchanged.
    ...compactPatch({
      industry: patchText(values.industry, stored.industry),
      city: patchText(values.city, stored.city),
      countryCode: patchCountry(values.countryCode, stored.countryCode),
      shortDescription: patchText(values.shortDescription, stored.shortDescription),
      companySizeRange: patchEnum<CompanySizeRange>(
        values.companySizeRange || '',
        stored.companySizeRange ?? null,
      ),
      foundedYear: patchNumber(values.foundedYear, stored.foundedYear),
      linkedinUrl: patchText(values.linkedinUrl, stored.linkedinUrl),
      xUrl: patchText(values.xUrl, stored.xUrl),
      instagramUrl: patchText(values.instagramUrl, stored.instagramUrl),
      youtubeUrl: patchText(values.youtubeUrl, stored.youtubeUrl),
    }),
  }
}

/**
 * Country codes are compared case-insensitively and sent upper-cased.
 *
 * <p>The server upper-cases what it stores, so a user who retypes "so" over a stored "SO" has
 * changed nothing — treating that as an edit would send a pointless write, and treating "so" as
 * different from "SO" on every load would make the form permanently dirty.
 */
function patchCountry(formValue: string | undefined, stored: string | null | undefined) {
  const patch = patchText(formValue?.toUpperCase(), stored?.toUpperCase())
  return patch === ABSENT || patch === null ? patch : patch.toUpperCase()
}

/** Loads a stored organization into the form. */
export function toOrganizationFormValues(organization: OrganizationResponse): UpdateOrganizationFormValues {
  return {
    name: organization.name,
    registrationNumber: organization.registrationNumber ?? '',
    website: organization.website ?? '',
    description: organization.description ?? '',
    industry: organization.industry ?? '',
    city: organization.city ?? '',
    countryCode: organization.countryCode ?? '',
    shortDescription: organization.shortDescription ?? '',
    companySizeRange: organization.companySizeRange ?? '',
    foundedYear: organization.foundedYear ?? '',
    linkedinUrl: organization.linkedinUrl ?? '',
    xUrl: organization.xUrl ?? '',
    instagramUrl: organization.instagramUrl ?? '',
    youtubeUrl: organization.youtubeUrl ?? '',
  }
}
