package com.fursadhub.common.api;

/**
 * A server-generated temporary credential, returned exactly once to the authorized admin who
 * triggered a staff password reset (CLAUDE.md section 26A). Shared by the university and
 * organization staff-management modules since the shape is identical for both.
 */
public record TemporaryCredentialResponse(String membershipId, String email, String temporaryPassword) {
}
