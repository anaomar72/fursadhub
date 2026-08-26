package com.fursadhub.student.api;

/**
 * Whether a CV is on file.
 *
 * <p>Deliberately does not carry the stored file's id. Nothing in the client needs it — the download
 * route is addressed by the OWNING RESOURCE, not by file id — and publishing it would suggest a
 * generic {@code /files/{id}} route exists, which it does not and must not.
 */
public record StudentCvResponse(boolean present) {
}
