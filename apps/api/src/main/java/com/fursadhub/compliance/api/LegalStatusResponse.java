package com.fursadhub.compliance.api;

import java.util.List;

/**
 * What the signed-in user still has to accept.
 *
 * <p>{@code outstanding} being empty is the normal state and includes the case where no legal
 * documents have been published at all — a fresh pilot environment must not block anyone from
 * working because an administrator has not published terms yet.
 */
public record LegalStatusResponse(boolean acceptanceRequired, List<LegalDocumentResponse> outstanding) {

    public static LegalStatusResponse of(List<LegalDocumentResponse> outstanding) {
        return new LegalStatusResponse(!outstanding.isEmpty(), outstanding);
    }
}
