package com.fursadhub.identity.api;

import jakarta.validation.constraints.NotBlank;

/**
 * Credentials for {@code POST /api/v1/auth/login}.
 *
 * <p>Backend Phase B5.5 widened this ADDITIVELY. {@code email} lost its {@code @NotBlank} so that a
 * managed staff member can log in by {@code username} instead — but exactly ONE of the two must be
 * supplied, which is checked in {@code LoginService} because Bean Validation cannot express
 * "exactly one of these".
 *
 * <p>Every existing client keeps working unchanged: a body carrying {@code email} and
 * {@code password} behaves exactly as it always has. {@code email} was deliberately NOT renamed to a
 * generic {@code identifier} — that would have broken every caller for a cosmetic gain.
 *
 * <p><strong>Ambiguity is rejected, never resolved by precedence.</strong> Supplying both
 * identifiers is a {@code VALIDATION_FAILED} 400 rather than a silent preference for one, because a
 * caller that sends both does not know which account it is authenticating and guessing on its behalf
 * is how the wrong account gets logged into.
 *
 * @param email    the self-service login identifier; also legacy managed staff without a username
 * @param username the managed-staff login identifier (Backend Phase B5.5)
 */
public record LoginRequest(String email, String username, @NotBlank String password) {
}
