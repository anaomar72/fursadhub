import { ABSENT, compactPatch, patchText } from '../../lib/validation/patchField'
import type { UpdateUniversityFormValues } from './schemas/universitySetupSchema'
import type { UniversityDetailResponse } from './types'

/**
 * Builds the `PATCH /universities/{id}` body from the form and the record it was loaded from.
 *
 * <p>Same two-semantics split as the organization's (see `UpdateUniversityRequest`): the five
 * ORIGINAL fields are full replacement and are always sent, while `countryCode` and
 * `publicContactEmail` are presence-aware and are omitted unless they actually changed.
 *
 * <p>The rule enforced here is Phase D section 34: an untouched value must be preserved, not wiped
 * by default form serialization, and an explicitly emptied one must be sent as a real `null`.
 */
export function buildUniversityProfilePayload(
  values: UpdateUniversityFormValues,
  stored: UniversityDetailResponse,
) {
  return {
    // Full replacement — always present.
    name: values.name,
    city: values.city || undefined,
    registrationNumber: values.registrationNumber || undefined,
    website: values.website || undefined,
    description: values.description || undefined,

    // Presence-aware — omitted when unchanged.
    ...compactPatch({
      countryCode: patchCountry(values.countryCode, stored.countryCode),
      publicContactEmail: patchText(values.publicContactEmail, stored.publicContactEmail),
    }),
  }
}

/** Case-insensitive comparison, upper-cased on the wire — the server stores the upper-cased form. */
function patchCountry(formValue: string | undefined, stored: string | null | undefined) {
  const patch = patchText(formValue?.toUpperCase(), stored?.toUpperCase())
  return patch === ABSENT || patch === null ? patch : patch.toUpperCase()
}

/** Loads a stored university into the form. */
export function toUniversityFormValues(university: UniversityDetailResponse): UpdateUniversityFormValues {
  return {
    name: university.name,
    city: university.city ?? '',
    registrationNumber: university.registrationNumber ?? '',
    website: university.website ?? '',
    description: university.description ?? '',
    countryCode: university.countryCode ?? '',
    publicContactEmail: university.publicContactEmail ?? '',
  }
}
