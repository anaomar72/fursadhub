package com.fursadhub.opportunity.domain;

import java.util.UUID;

/**
 * Public discovery filters (CLAUDE.md section 12). {@code query} matches title/description.
 * Any field may be {@code null} to mean "no filter".
 */
public record PublicOpportunityFilter(String query, String location, WorkMode workMode, UUID organizationId) {
}
