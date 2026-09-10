package com.fursadhub.opportunity.domain;

/**
 * The platform administrator's opportunity filter (Backend Phase B6).
 *
 * <p><strong>Deliberately not {@link PublicOpportunityFilter}.</strong> The two look similar and mean
 * opposite things. Public discovery answers "what may a student see?" and is bound by
 * {@link PublicOpportunityVisibility}; this answers "what exists on the platform?" and is bound by
 * nothing — a Super Admin overseeing FursadHub must be able to see a DRAFT, a CANCELLED one, and a
 * PUBLISHED one whose organization has been suspended. Sharing one filter type would eventually
 * invite sharing one query, and the day that happened either administrators would go blind to
 * half the platform or students would start seeing drafts.
 *
 * <p>Every field is optional; null means "do not narrow on this". The set is deliberately small —
 * status, mode, owner and a text query — because these are the four an operator actually
 * investigates by. {@code workMode} is returned in the response but is not a filter: nothing in the
 * admin console groups work by it, and a filter nobody uses is still a query path to maintain.
 *
 * @param query          matched against opportunity title and owning organization name
 * @param status         exact opportunity lifecycle state
 * @param mode           exact sourcing mode
 * @param organizationId exact owning organization
 */
public record AdminOpportunityFilter(
        String query,
        OpportunityStatus status,
        OpportunityMode mode,
        java.util.UUID organizationId) {
}
