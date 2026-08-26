-- Phase 7: versioned legal documents and acceptance records (CLAUDE.md section 49).
--
-- Two ideas that CLAUDE.md section 49 insists are NOT the same thing:
--   * accepting the Terms is a contractual act, recorded here against one exact document version;
--   * consenting to optional processing is a separate, freely withdrawable choice, recorded in
--     consent_records below.
-- Accepting the Terms therefore grants no consent to anything, and withdrawing a consent does not
-- retract the Terms.
CREATE TABLE legal_documents (
    id UUID PRIMARY KEY,
    document_type VARCHAR(40) NOT NULL,
    -- Human-meaningful version label chosen by the publisher, e.g. "2026-01" or "1.2".
    version VARCHAR(40) NOT NULL,
    locale VARCHAR(5) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    -- The date from which this version governs. Publishing is the act that makes a version real;
    -- a row with published_at IS NULL is still a draft and is never served to anyone.
    effective_from DATE NOT NULL,
    published_at TIMESTAMPTZ,
    created_by_user_id UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_legal_documents_type CHECK (document_type IN ('TERMS', 'PRIVACY_POLICY', 'COOKIE_POLICY')),
    CONSTRAINT ck_legal_documents_locale CHECK (locale IN ('en', 'so')),
    -- One row per type+version+locale. This is what makes a published version immutable in practice:
    -- changing the wording means publishing a new version, so an acceptance recorded last month can
    -- never come to mean something the user never saw.
    CONSTRAINT uk_legal_documents_type_version_locale UNIQUE (document_type, version, locale)
);

CREATE INDEX idx_legal_documents_lookup
    ON legal_documents (document_type, locale, effective_from DESC)
    WHERE published_at IS NOT NULL;

-- Which user accepted which exact document version, and from where.
CREATE TABLE terms_acceptances (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    legal_document_id UUID NOT NULL REFERENCES legal_documents (id),
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address VARCHAR(64),
    user_agent VARCHAR(255),

    -- Accepting twice is a no-op, not a second record. The constraint — not a read-then-insert in
    -- Java — is what makes a double-clicked Accept button safe.
    CONSTRAINT uk_terms_acceptances_user_document UNIQUE (user_id, legal_document_id)
);

CREATE INDEX idx_terms_acceptances_user ON terms_acceptances (user_id);

-- Optional, withdrawable consent — deliberately NOT derived from terms acceptance.
CREATE TABLE consent_records (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    consent_type VARCHAR(60) NOT NULL,
    granted BOOLEAN NOT NULL,
    -- Both timestamps are kept: a withdrawn consent still records that it was once granted and when,
    -- which is the evidence that matters if the processing is ever questioned.
    granted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_consent_records_type CHECK (consent_type IN ('PRODUCT_UPDATE_EMAIL', 'OPPORTUNITY_RECOMMENDATION_EMAIL')),
    CONSTRAINT uk_consent_records_user_type UNIQUE (user_id, consent_type)
);
