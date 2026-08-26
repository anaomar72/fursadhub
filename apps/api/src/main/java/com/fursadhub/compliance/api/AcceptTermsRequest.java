package com.fursadhub.compliance.api;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Acceptance names the exact document version being accepted, not just its type. The record is only
 * useful as evidence if it points at the text the user was actually shown.
 */
public record AcceptTermsRequest(@NotNull UUID legalDocumentId) {
}
