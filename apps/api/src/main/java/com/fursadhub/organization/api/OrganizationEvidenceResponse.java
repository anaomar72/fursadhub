package com.fursadhub.organization.api;

/**
 * Whether a registration license is on file for an organization.
 *
 * <p>Carries no stored-file id: the document is addressed through the organization that owns it, and
 * publishing a file id would imply a generic file route that deliberately does not exist.
 */
public record OrganizationEvidenceResponse(boolean present) {
}
