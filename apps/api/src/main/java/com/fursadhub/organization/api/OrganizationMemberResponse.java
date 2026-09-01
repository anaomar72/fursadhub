package com.fursadhub.organization.api;

import com.fursadhub.organization.application.OrganizationMembershipService;

public record OrganizationMemberResponse(String membershipId, String email, String role, String status) {

    public static OrganizationMemberResponse from(OrganizationMembershipService.Member member) {
        return new OrganizationMemberResponse(
                member.membership().getId().toString(),
                member.email(),
                member.membership().getRole().name(),
                member.status() == null ? null : member.status().name());
    }
}
