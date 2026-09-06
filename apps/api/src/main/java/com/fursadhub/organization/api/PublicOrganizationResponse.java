package com.fursadhub.organization.api;

import com.fursadhub.organization.domain.Organization;

/**
 * An organization as anyone browsing FursadHub — signed in or not — sees it.
 *
 * <p>Only fields the organization itself chose to publish, plus the platform's own verification
 * verdict. Backend Phase B2 widened this additively so a public profile can answer "would I want to
 * intern here?" from real institution-managed data: sector, location, the short summary a card
 * shows, size band, founding year, social links and the banner.
 *
 * <p>Still never exposed: {@code registrationNumber}, the raw {@code verificationStatus} (only the
 * coarse {@code verified} fact), evidence state, stored-file ids, memberships, staff, or anything
 * derived from placements. {@code hasLogo}/{@code hasCover} are booleans, not file ids — the bytes
 * are fetched through their own routes (CLAUDE.md section 47).
 */
public record PublicOrganizationResponse(
        String id,
        String name,
        String slug,
        String type,
        String industry,
        String city,
        String countryCode,
        String shortDescription,
        String description,
        String website,
        String companySizeRange,
        Integer foundedYear,
        String linkedinUrl,
        String xUrl,
        String instagramUrl,
        String youtubeUrl,
        boolean verified,
        boolean hasLogo,
        boolean hasCover) {

    public static PublicOrganizationResponse from(Organization organization) {
        return new PublicOrganizationResponse(
                organization.getId().toString(),
                organization.getName(),
                organization.getSlug(),
                organization.getType().name(),
                organization.getIndustry(),
                organization.getCity(),
                organization.getCountryCode(),
                organization.getShortDescription(),
                organization.getDescription(),
                organization.getWebsite(),
                organization.getCompanySizeRange() == null ? null : organization.getCompanySizeRange().name(),
                organization.getFoundedYear(),
                organization.getLinkedinUrl(),
                organization.getXUrl(),
                organization.getInstagramUrl(),
                organization.getYoutubeUrl(),
                organization.isVerified(),
                organization.getLogoStoredFileId() != null,
                organization.getCoverStoredFileId() != null);
    }
}
