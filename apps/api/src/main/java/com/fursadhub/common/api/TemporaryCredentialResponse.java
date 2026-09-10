package com.fursadhub.common.api;

/**
 * A server-generated temporary credential, returned exactly once to the authorized admin who
 * triggered a staff password reset (CLAUDE.md section 26A). Shared by the university and
 * organization staff-management modules since the shape is identical for both.
 *
 * <p>Backend Phase B5.5 added {@code username} ADDITIVELY, because the response would otherwise be
 * unusable: once a managed account has a username, its email no longer authenticates it, so telling
 * the admin only the email would hand them a password and the wrong identifier to use it with.
 *
 * <p>{@code email} is kept — it remains the contact and password-recovery address, and existing
 * clients still read it. {@code username} is null for a legacy account that has not been assigned
 * one, which is exactly the account that still logs in by email. No display name here: this response
 * carries credentials, and who the person is belongs on the staff record.
 */
public record TemporaryCredentialResponse(
        String membershipId, String username, String email, String temporaryPassword) {
}
