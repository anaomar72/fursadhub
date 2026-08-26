package com.fursadhub.administration.domain;

/**
 * Platform-level roles — CLAUDE.md section 23. Do not add roles without explicit approval.
 *
 * <p>These are the only two roles that are NOT scoped to a university or an organization. Everything
 * else in FursadHub is contextual: a {@code RECRUITER} is a recruiter OF an organization, a
 * {@code DEPARTMENT_COORDINATOR} coordinates SOME departments. These two are scoped to the platform
 * itself, which is exactly why holding one is stored as a revocable grant with history rather than
 * as a flag on the user row.
 */
public enum PlatformRole {

    /** Full platform authority: institution verification, account suspension, privacy requests, audit. */
    SUPER_ADMIN,

    /**
     * Verification only. May review institutions and escalated student cases, and may read the
     * verification evidence that goes with them — but may not suspend accounts, grant platform roles,
     * or publish legal documents.
     */
    VERIFICATION_OFFICER
}
