package com.fursadhub.organization.api;

import com.fursadhub.organization.domain.Organization;

/**
 * Safe, public-facing organization fields only — embedded in public opportunity responses.
 *
 * <p>{@code verified} lets a student see the trust signal directly on an opportunity card, not only
 * after clicking through to the organization's own public profile (Phase 8).
 */
public record OrganizationSummaryResponse(String id, String name, String slug, String type, boolean verified) {

    public static OrganizationSummaryResponse from(Organization organization) {
        return new OrganizationSummaryResponse(
                organization.getId().toString(), organization.getName(), organization.getSlug(),
                organization.getType().name(), organization.isVerified());
    }
}
