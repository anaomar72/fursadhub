package com.fursadhub.compliance.domain;

/** Versioned legal document kinds — CLAUDE.md section 49. Do not add kinds without explicit approval. */
public enum LegalDocumentType {

    /** Contractual terms of use. Acceptance is required and is recorded per version. */
    TERMS,

    /**
     * How FursadHub processes personal data. Acceptance is recorded so it is provable which version
     * a user was shown — which is NOT the same as consenting to optional processing
     * (CLAUDE.md section 49). Optional processing lives in {@link ConsentType}.
     */
    PRIVACY_POLICY,

    /** Cookie notice. Informational: published and readable, but not gated on acceptance. */
    COOKIE_POLICY;

    /**
     * Whether a user must accept this document to keep using FursadHub.
     *
     * <p>Only TERMS and PRIVACY_POLICY. Gating the product on a cookie notice would turn an
     * informational page into a consent wall, which is the pattern CLAUDE.md section 49 warns
     * against by insisting terms acceptance is not blanket consent.
     */
    public boolean requiresAcceptance() {
        return this == TERMS || this == PRIVACY_POLICY;
    }
}
