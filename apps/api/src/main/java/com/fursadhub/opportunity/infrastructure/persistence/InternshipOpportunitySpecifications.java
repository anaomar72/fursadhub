package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.AdminOpportunityFilter;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.PublicOpportunityFilter;
import com.fursadhub.opportunity.domain.PublicOpportunityVisibility;
import com.fursadhub.organization.domain.Organization;

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
        return PublicOpportunityPredicates::publiclyVisible;
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

    /**
     * The platform-administration query (Backend Phase B6).
     *
     * <p><strong>{@link #publiclyVisible()} is deliberately NOT applied.</strong> That is the whole
     * point of this specification existing separately: an administrator overseeing the platform must
     * see a DRAFT, a CANCELLED opportunity, and a PUBLISHED one whose organization has since been
     * suspended — the last of which is invisible publicly and is exactly the case someone would open
     * a console to investigate. Public discoverability and administrative visibility are different
     * questions, so they are different queries.
     *
     * <p>This is read-only and narrows nothing by default: with an empty filter it matches every
     * opportunity, paged by the caller.
     */
    static Specification<InternshipOpportunity> matchingForAdmin(AdminOpportunityFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.query() != null && !filter.query().isBlank()) {
                String like = "%" + filter.query().toLowerCase().trim() + "%";
                // Organization name is reached by a CORRELATED SUBQUERY, the same technique
                // publiclyVisible() uses: InternshipOpportunity holds organizationId as a plain UUID
                // rather than a mapped association, and the modules are deliberately not joined
                // through JPA. This keeps the search inside ONE statement — no join to maintain, and
                // emphatically no loading organizations into memory to filter them in Java.
                Subquery<UUID> organizationsNamed = query.subquery(UUID.class);
                Root<Organization> organization = organizationsNamed.from(Organization.class);
                organizationsNamed.select(organization.get("id"))
                        .where(cb.like(cb.lower(organization.get("name")), like));

                // Title and organization name only. Description is a 4000-character column with no
                // index that could serve a leading wildcard, so including it would turn every admin
                // search into a full scan of the widest column on the table for little operational
                // gain — an operator looks for a company or a job title, not a phrase in the body.
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        root.get("organizationId").in(organizationsNamed)));
            }
            if (filter.status() != null) {
                predicates.add(cb.equal(root.get("status"), filter.status()));
            }
            if (filter.mode() != null) {
                predicates.add(cb.equal(root.get("mode"), filter.mode()));
            }
            if (filter.organizationId() != null) {
                predicates.add(cb.equal(root.get("organizationId"), filter.organizationId()));
            }
            // No predicates means no restriction — cb.and() of nothing is TRUE, which is the correct
            // reading of "the administrator asked for everything".
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    static Specification<InternshipOpportunity> publicById(UUID id) {
        return (root, query, cb) -> cb.and(
                publiclyVisible().toPredicate(root, query, cb),
                cb.equal(root.get("id"), id));
    }
}
