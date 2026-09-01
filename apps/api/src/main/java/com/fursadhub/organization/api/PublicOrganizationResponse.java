package com.fursadhub.organization.api;

import com.fursadhub.organization.domain.Organization;

/**
 * An organization as anyone browsing FursadHub — signed in or not — sees it. Only fields the
 * organization itself would want shown publicly: no registration number, no membership, no
 * evidence state (only the coarse VERIFIED/not-yet fact, via {@code verified}).
 */
public record PublicOrganizationResponse(
        String id,
        String name,
        String slug,
        String type,
        String website,
        String description,
        boolean verified,
        boolean hasLogo) {

    public static PublicOrganizationResponse from(Organization organization) {
        return new PublicOrganizationResponse(
                organization.getId().toString(),
                organization.getName(),
                organization.getSlug(),
                organization.getType().name(),
                organization.getWebsite(),
                organization.getDescription(),
                organization.isVerified(),
                organization.getLogoStoredFileId() != null);
    }
}
