package com.fursadhub.organization.domain;

/**
 * The filters a visitor may apply to the public organization directory, mirroring
 * {@code PublicOpportunityFilter}.
 *
 * <p>Deliberately narrow. Sector, location and size are NOT here: those columns do not exist yet
 * (Backend Phase B2), and a filter with nothing behind it would be a control that silently does
 * nothing. Verification status is likewise absent — it is not a filter but a fixed precondition of
 * the directory itself, enforced in the query rather than chosen by the caller.
 *
 * @param query a case-insensitive fragment of the organization's name; null or blank matches all
 * @param type  restrict to one {@link OrganizationType}; null matches all
 */
public record PublicOrganizationFilter(String query, OrganizationType type) {

    public static PublicOrganizationFilter unfiltered() {
        return new PublicOrganizationFilter(null, null);
    }
}
