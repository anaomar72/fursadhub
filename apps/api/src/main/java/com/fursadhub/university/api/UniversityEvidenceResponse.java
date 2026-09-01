package com.fursadhub.university.api;

/**
 * Whether a registration document is on file for a university.
 *
 * <p>Carries no stored-file id: the document is addressed through the university that owns it, and
 * publishing a file id would imply a generic file route that deliberately does not exist.
 */
public record UniversityEvidenceResponse(boolean present) {
}
