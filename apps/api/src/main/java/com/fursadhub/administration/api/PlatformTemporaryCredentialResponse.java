package com.fursadhub.administration.api;

import com.fursadhub.administration.application.PlatformAccountService;

import java.util.UUID;

/**
 * A server-generated temporary password for a platform officer, returned exactly once
 * (Backend Phase B5.6).
 *
 * <p><strong>Deliberately NOT {@code TemporaryCredentialResponse}.</strong> That record's first
 * component is a {@code membershipId}, and a platform officer has no membership — no university, no
 * organization, no tenant at all. Reusing it would have meant sending {@code membershipId: null} on
 * every platform reset, which is not a smaller change but a false one: it would tell every client
 * that platform officers are tenant staff whose membership happens to be missing, and the first
 * consumer to branch on that null would encode the confusion permanently. A four-field record that
 * says what a platform credential actually is costs less than that.
 *
 * <p>{@code temporaryPassword} is the only place this plaintext ever appears. It is not persisted,
 * not written to the audit metadata, and not logged (CLAUDE.md section 68); after this response the
 * server cannot recover it, so a lost value means another reset.
 */
public record PlatformTemporaryCredentialResponse(
        UUID userId,
        String username,
        String email,
        String temporaryPassword) {

    public static PlatformTemporaryCredentialResponse from(PlatformAccountService.PlatformCredential credential) {
        return new PlatformTemporaryCredentialResponse(
                credential.userId(),
                credential.username(),
                credential.email(),
                credential.temporaryPassword());
    }
}
