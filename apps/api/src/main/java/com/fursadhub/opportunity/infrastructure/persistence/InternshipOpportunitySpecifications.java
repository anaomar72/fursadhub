package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.OpportunityStatus;
import com.fursadhub.opportunity.domain.PublicOpportunityFilter;
import jakarta.persistence.criteria.Predicate;
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

    static Specification<InternshipOpportunity> publiclyVisible() {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("status"), OpportunityStatus.PUBLISHED),
                root.get("mode").in(OpportunityMode.PUBLIC, OpportunityMode.HYBRID));
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
