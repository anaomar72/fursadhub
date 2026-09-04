package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.PublicOpportunityFilter;
import com.fursadhub.opportunity.domain.PublicOpportunityVisibility;
import com.fursadhub.organization.domain.Organization;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Builds the public-discovery query (CLAUDE.md section 11/12). Every specification here also
 * enforces the "only PUBLISHED PUBLIC/HYBRID opportunities are publicly discoverable" invariant —
 * callers must never bypass it, since a targeted-only or draft opportunity must never leak here.
 */
final class InternshipOpportunitySpecifications {

    private InternshipOpportunitySpecifications() {
    }

    /**
     * The rule itself lives in {@link PublicOpportunityVisibility} so every surface that must agree
     * with this query binds from one definition.
     *
     * <p>Backend Phase B1.5 added the organization term. {@code InternshipOpportunity} holds
     * {@code organizationId} as a plain UUID rather than a mapped association (the modules are
     * deliberately not joined through JPA), so the check is a CORRELATED SUBQUERY against the
     * {@code Organization} root rather than a join. That keeps it inside the same SQL statement:
     * one query for a page, no per-row organization lookup, and the B1 batching in
     * {@code PublicOpportunityController} is unaffected.
     */
    static Specification<InternshipOpportunity> publiclyVisible() {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("status"), PublicOpportunityVisibility.STATUS),
                root.get("mode").in(PublicOpportunityVisibility.MODES),
                owningOrganizationIsVerified(root, query, cb));
    }

    /**
     * {@code EXISTS (SELECT 1 FROM Organization o WHERE o.id = opportunity.organizationId AND
     * o.verificationStatus = VERIFIED)}.
     *
     * <p>Evaluated live on every read, which is the whole point: an organization suspended after
     * publishing loses discoverability immediately, and one restored to {@code VERIFIED} regains it
     * immediately — in both cases without touching a single opportunity row.
     */
    private static Predicate owningOrganizationIsVerified(
            Root<InternshipOpportunity> root, CriteriaQuery<?> query, CriteriaBuilder cb) {
        Subquery<UUID> verifiedOwner = query.subquery(UUID.class);
        Root<Organization> organization = verifiedOwner.from(Organization.class);
        verifiedOwner.select(organization.get("id"))
                .where(cb.and(
                        cb.equal(organization.get("id"), root.get("organizationId")),
                        cb.equal(
                                organization.get("verificationStatus"),
                                PublicOpportunityVisibility.REQUIRED_ORGANIZATION_STATUS)));
        return cb.exists(verifiedOwner);
    }

    static Specification<InternshipOpportunity> matching(PublicOpportunityFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(publiclyVisible().toPredicate(root, query, cb));

            if (filter.query() != null && !filter.query().isBlank()) {
                String like = "%" + filter.query().toLowerCase().trim() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("description")), like)));
            }
            if (filter.location() != null && !filter.location().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("location")), "%" + filter.location().toLowerCase().trim() + "%"));
            }
            if (filter.workMode() != null) {
                predicates.add(cb.equal(root.get("workMode"), filter.workMode()));
            }
            if (filter.organizationId() != null) {
                predicates.add(cb.equal(root.get("organizationId"), filter.organizationId()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    static Specification<InternshipOpportunity> publicById(UUID id) {
        return (root, query, cb) -> cb.and(
                publiclyVisible().toPredicate(root, query, cb),
                cb.equal(root.get("id"), id));
    }
}
