package com.fursadhub.placement.api;

import com.fursadhub.placement.application.PlacementQueryService;
import com.fursadhub.placement.domain.Placement;

/**
 * The placement as every area renders it (CLAUDE.md section 6 — JPA entities are never exposed).
 *
 * <p>University and department are the placement's OWN historical context, not a live lookup
 * through the student's current enrollment, so this response keeps reporting the right academic
 * context even after the student's profile changes.
 */
public record PlacementResponse(
        String id,
        String candidacyId,
        String opportunityId,
        String opportunityTitle,
        String organizationId,
        String organizationName,
        String universityId,
        String universityName,
        String departmentId,
        String departmentName,
        String studentUserId,
        String studentFullName,
        String studentEmail,
        String startDate,
        String endDate,
        String location,
        String status,
        String startedAt,
        String completionRequestedAt,
        String completedAt,
        String cancelledAt,
        String terminatedAt,
        String cancellationReason,
        String terminationReason,
        SupervisorAssignmentResponse universitySupervisor,
        SupervisorAssignmentResponse organizationSupervisor,
        String createdAt,
        String updatedAt) {

    public static PlacementResponse from(PlacementQueryService.PlacementView view) {
        Placement placement = view.placement();
        return new PlacementResponse(
                placement.getId().toString(),
                placement.getCandidacyId().toString(),
                placement.getOpportunityId().toString(),
                view.opportunityTitle(),
                placement.getOrganizationId().toString(),
                view.organizationName(),
                placement.getUniversityId().toString(),
                view.universityName(),
                placement.getDepartmentId().toString(),
                view.departmentName(),
                placement.getStudentUserId().toString(),
                view.studentFullName(),
                view.studentEmail(),
                placement.getStartDate().toString(),
                placement.getEndDate().toString(),
                placement.getLocation(),
                placement.getStatus().name(),
                text(placement.getStartedAt()),
                text(placement.getCompletionRequestedAt()),
                text(placement.getCompletedAt()),
                text(placement.getCancelledAt()),
                text(placement.getTerminatedAt()),
                placement.getCancellationReason(),
                placement.getTerminationReason(),
                view.universitySupervisor().map(SupervisorAssignmentResponse::from).orElse(null),
                view.organizationSupervisor().map(SupervisorAssignmentResponse::from).orElse(null),
                placement.getCreatedAt().toString(),
                placement.getUpdatedAt().toString());
    }

    private static String text(java.time.Instant instant) {
        return instant == null ? null : instant.toString();
    }
}
