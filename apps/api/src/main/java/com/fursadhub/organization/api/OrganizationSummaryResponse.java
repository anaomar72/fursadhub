package com.fursadhub.organization.api;

import com.fursadhub.organization.domain.Organization;

/** Safe, public-facing organization fields only — embedded in public opportunity responses. */
public record OrganizationSummaryResponse(String id, String name, String slug, String type) {

    public static OrganizationSummaryResponse from(Organization organization) {
        return new OrganizationSummaryResponse(
                organization.getId().toString(), organization.getName(), organization.getSlug(), organization.getType().name());
    }
}
