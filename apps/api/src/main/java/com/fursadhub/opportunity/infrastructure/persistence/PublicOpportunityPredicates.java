package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.PublicOpportunityVisibility;
import com.fursadhub.organization.domain.Organization;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.From;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

import java.util.UUID;

/**
 * The canonical "publicly discoverable" predicate, as a Criteria fragment that can be applied to an
 * opportunity reached from ANY query root.
 *
 * <p>Extracted in Backend Phase B4 for the reason B1 and B1.5 each extracted before it: a new call
 * site needed the same rule. Saved Internships must show a student exactly the opportunities
 * {@code GET /api/v1/public/opportunities/{id}} would show them and no more, so it has to apply the
 * same three terms — and the one thing that must never happen is a second, subtly different
 * "saved-visible" rule drifting from this one.
 *
 * <p><strong>Why a {@code From} rather than a {@code Root}.</strong> The public discovery query is
 * rooted at the opportunity, but the saved-list query is rooted at the bookmark and reaches the
 * opportunity through a join — it has to be, because the list is ordered by when the student saved
 * it, which is a column on the bookmark. Accepting {@code From<?, InternshipOpportunity>} covers
 * both without either call site restating the rule.
 *
 * <p>The rule's VALUES still live in {@link PublicOpportunityVisibility}; this class only expresses
 * them as SQL.
 */
public final class PublicOpportunityPredicates {

    private PublicOpportunityPredicates() {
    }

    /**
     * {@code status = PUBLISHED AND mode IN (PUBLIC, HYBRID) AND EXISTS (verified owning org)}.
     *
     * @param opportunity the opportunity, whether it is the query root or a join target
     */
    public static Predicate publiclyVisible(
            From<?, InternshipOpportunity> opportunity, CriteriaQuery<?> query, CriteriaBuilder cb) {
        return cb.and(
                cb.equal(opportunity.get("status"), PublicOpportunityVisibility.STATUS),
                opportunity.get("mode").in(PublicOpportunityVisibility.MODES),
                owningOrganizationIsVerified(opportunity, query, cb));
    }

    /**
     * {@code EXISTS (SELECT 1 FROM Organization o WHERE o.id = opportunity.organizationId AND
     * o.verificationStatus = VERIFIED)}.
     *
     * <p>Evaluated live on every read, which is the whole point (Backend Phase B1.5): an
     * organization suspended after publishing loses discoverability immediately — including through
     * a student's saved list — and one restored to {@code VERIFIED} regains it immediately, in both
     * cases without touching a single opportunity or bookmark row.
     *
     * <p>A correlated subquery rather than a join because {@code InternshipOpportunity} holds
     * {@code organizationId} as a plain UUID: the modules are deliberately not joined through JPA.
     */
    private static Predicate owningOrganizationIsVerified(
            From<?, InternshipOpportunity> opportunity, CriteriaQuery<?> query, CriteriaBuilder cb) {
        Subquery<UUID> verifiedOwner = query.subquery(UUID.class);
        Root<Organization> organization = verifiedOwner.from(Organization.class);
        verifiedOwner.select(organization.get("id"))
                .where(cb.and(
                        cb.equal(organization.get("id"), opportunity.get("organizationId")),
                        cb.equal(
                                organization.get("verificationStatus"),
                                PublicOpportunityVisibility.REQUIRED_ORGANIZATION_STATUS)));
        return cb.exists(verifiedOwner);
    }
}
