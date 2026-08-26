package com.fursadhub.internshipmanagement.api;

import jakarta.validation.constraints.Size;

/**
 * A reviewer's comment. Optional when accepting work, required when sending it back — the service
 * enforces the "required" half, since a return without an explanation is useless to the student.
 */
public record ReviewCommentRequest(@Size(max = 2000) String comment) {

    public static String commentOf(ReviewCommentRequest request) {
        return request == null ? null : request.comment();
    }
}
