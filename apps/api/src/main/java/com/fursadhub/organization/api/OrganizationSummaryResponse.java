package com.fursadhub.organization.api;

import com.fursadhub.organization.domain.Organization;

/**
 * Safe, public-facing organization fields only — embedded in public opportunity responses.
 *
 * <p>{@code verified} lets a student see the trust signal directly on an opportunity card, not only
 * after clicking through to the organization's own public profile (Phase 8).
 *
 * <p>{@code hasLogo} was added additively in Backend Phase B1. Without it a client rendering an
 * opportunity card had to fire a speculative request at the public logo route and fall back on the
 * error, which meant a guaranteed 404 for every logo-less organization on every page. It is read
 * from a column on the aggregate that is already in memory — never a second query per row.
 */
public record OrganizationSummaryResponse(
        String id, String name, String slug, String type, boolean verified, boolean hasLogo) {

    public static OrganizationSummaryResponse from(Organization organization) {
        return new OrganizationSummaryResponse(
                organization.getId().toString(), organization.getName(), organization.getSlug(),
                organization.getType().name(), organization.isVerified(),
                organization.getLogoStoredFileId() != null);
    }
}
