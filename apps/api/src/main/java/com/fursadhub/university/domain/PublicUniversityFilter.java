package com.fursadhub.university.domain;

/**
 * The filters a visitor may apply to the public university directory, the counterpart of
 * {@code PublicOrganizationFilter} (Backend Phase B2 added {@code city} and {@code country}).
 *
 * <p>Deliberately smaller than the organization's: industry, size and founded year are organization
 * concepts, and a "university type" facet has no column behind it. B1's rule still holds — a filter
 * appears only once real data backs it.
 *
 * <p>Verification status is absent by design: the directory is {@code VERIFIED}-only as a fixed
 * precondition enforced in the query, never a filter a caller may relax.
 *
 * @param query   case-insensitive fragment of the university's name; null or blank matches all
 * @param city    case-insensitive EXACT match on the stored city; null matches all
 * @param country ISO-3166-1 alpha-2, case-insensitive; null matches all
 */
public record PublicUniversityFilter(String query, String city, String country) {

    public static PublicUniversityFilter unfiltered() {
        return new PublicUniversityFilter(null, null, null);
    }
}
