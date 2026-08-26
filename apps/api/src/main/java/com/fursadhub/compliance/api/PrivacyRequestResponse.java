package com.fursadhub.compliance.api;

import com.fursadhub.compliance.domain.PrivacyRequest;

import java.time.Instant;
import java.util.UUID;

/**
 * A privacy request as the data subject or an administrator sees it.
 *
 * <p>The same shape serves both, because there is nothing here the subject may not see: it is their
 * own request, their own words, and the resolution FursadHub gave them. The reviewer's user id is
 * deliberately absent — who inside FursadHub handled it is in the audit trail, not in a response the
 * subject reads.
 */
public record PrivacyRequestResponse(
        UUID id,
        String requestType,
        String state,
        String details,
        Instant submittedAt,
        Instant reviewedAt,
        String resolutionNote) {

    public static PrivacyRequestResponse from(PrivacyRequest request) {
        return new PrivacyRequestResponse(
                request.getId(),
                request.getRequestType().name(),
                request.getState().name(),
                request.getDetails(),
                request.getSubmittedAt(),
                request.getReviewedAt(),
                request.getResolutionNote());
    }
}
