package com.fursadhub.university.api;

import com.fursadhub.university.application.MyUniversityMembershipQueryService;

import java.util.List;
import java.util.UUID;

public record MyMembershipResponse(String universityId, String role, List<UUID> departmentIds) {

    public static MyMembershipResponse from(MyUniversityMembershipQueryService.MyMembership membership) {
        return new MyMembershipResponse(
                membership.membership().getUniversityId().toString(),
                membership.membership().getRole().name(),
                membership.departmentIds());
    }
}
