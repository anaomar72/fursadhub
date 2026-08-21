package com.fursadhub.university.api;

import com.fursadhub.university.application.UniversityStaffService;

import java.util.List;
import java.util.UUID;

public record StaffMemberResponse(
        String membershipId, String userId, String email, String role, List<UUID> departmentIds, String assignedAt) {

    public static StaffMemberResponse from(UniversityStaffService.StaffMember staffMember) {
        return new StaffMemberResponse(
                staffMember.membership().getId().toString(),
                staffMember.membership().getUserId().toString(),
                staffMember.email(),
                staffMember.membership().getRole().name(),
                staffMember.departmentIds(),
                staffMember.membership().getAssignedAt().toString());
    }
}
