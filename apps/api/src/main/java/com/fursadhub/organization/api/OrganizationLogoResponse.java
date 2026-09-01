package com.fursadhub.organization.api;

/** Whether a logo is on file. No file id — see {@link OrganizationController}. */
public record OrganizationLogoResponse(boolean present) {
}
