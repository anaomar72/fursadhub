package com.fursadhub.organization.domain;

/**
 * The filters a visitor may apply to the public organization directory, mirroring
 * {@code PublicOpportunityFilter}.
 *
 * <p>Backend Phase B2 added {@code industry}, {@code city} and {@code country} — each one only now
 * that a real column backs it. B1 deliberately shipped without them rather than offering controls
 * with nothing behind them.
 *
 * <p>Deliberately still narrow: no size, founded-year or "more filters" grab-bag. A filter earns its
 * place by being something a student actually narrows on, not by existing in the data model.
 *
 * <p>Verification status is absent by design — it is not a filter but a fixed precondition of the
 * directory, enforced in the query rather than chosen by the caller (Backend Phase B1.5).
 *
 * @param query    case-insensitive fragment of the organization's name; null or blank matches all
 * @param type     restrict to one {@link OrganizationType}; null matches all
 * @param industry case-insensitive EXACT match on the stored industry; null matches all
 * @param city     case-insensitive EXACT match on the stored city; null matches all
 * @param country  ISO-3166-1 alpha-2, case-insensitive; null matches all
 */
public record PublicOrganizationFilter(
        String query, OrganizationType type, String industry, String city, String country) {

    public static PublicOrganizationFilter unfiltered() {
        return new PublicOrganizationFilter(null, null, null, null, null);
    }
}
