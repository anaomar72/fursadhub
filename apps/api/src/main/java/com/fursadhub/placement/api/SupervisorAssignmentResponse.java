package com.fursadhub.placement.api;

import com.fursadhub.placement.application.PlacementQueryService;

/**
 * One supervisor assignment period. {@code removedAt == null} marks the CURRENT holder; a populated
 * {@code removedAt} is a preserved history row (CLAUDE.md section 40).
 */
public record SupervisorAssignmentResponse(
        String id,
        String supervisorUserId,
        /** Backend Phase B5. Null for staff who have never been given a name; email is kept alongside. */
        String supervisorDisplayName,
        String supervisorEmail,
        String type,
        String assignedAt,
        String removedAt,
        boolean active) {

    public static SupervisorAssignmentResponse from(PlacementQueryService.SupervisorView view) {
        return new SupervisorAssignmentResponse(
                view.assignment().getId().toString(),
                view.assignment().getSupervisorUserId().toString(),
                view.displayName(),
                view.email(),
                view.assignment().getType().name(),
                view.assignment().getAssignedAt().toString(),
                view.assignment().getRemovedAt() == null ? null : view.assignment().getRemovedAt().toString(),
                view.assignment().isActive());
    }
}
