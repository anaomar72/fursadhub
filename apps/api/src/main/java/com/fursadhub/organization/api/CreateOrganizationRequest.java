package com.fursadhub.organization.api;

import com.fursadhub.common.api.PublicLink;
import com.fursadhub.common.api.PublicLinkPolicy;
import com.fursadhub.organization.domain.OrganizationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateOrganizationRequest(
        @NotBlank @Size(max = 255) String name,
        @NotNull OrganizationType type,
        @Size(max = 120) String registrationNumber,

        // Same rule as UpdateOrganizationRequest, because it is the same published field. Validating
        // only on update would leave registration as a way in: this website is rendered as a link on
        // the public profile, so a "javascript:" value set here would reach a visitor's browser.
        @Size(max = PublicLinkPolicy.URL_MAX_LENGTH) @PublicLink String website,

        @Size(max = 2000) String description) {
}
