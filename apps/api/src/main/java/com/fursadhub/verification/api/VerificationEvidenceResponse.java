package com.fursadhub.verification.api;

/**
 * Whether evidence is on file for a verification case.
 *
 * <p>Carries no stored-file id: the document is addressed through the case that owns it, and
 * publishing a file id would imply a generic file route that deliberately does not exist.
 */
public record VerificationEvidenceResponse(boolean present) {
}
