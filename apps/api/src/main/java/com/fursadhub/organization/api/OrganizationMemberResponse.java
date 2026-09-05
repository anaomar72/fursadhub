package com.fursadhub.organization.api;

import com.fursadhub.organization.application.OrganizationMembershipService;

/**
 * One managed staff member, for their own organization's admin.
 *
 * <p>Backend Phase B5 added {@code displayName} ADDITIVELY; {@code email} is kept for existing
 * clients and remains the contact/login field. Null display name is expected for staff created
 * before B5.
 */
public record OrganizationMemberResponse(
        String membershipId, String displayName, String email, String role, String status) {

    public static OrganizationMemberResponse from(OrganizationMembershipService.Member member) {
        return new OrganizationMemberResponse(
                member.membership().getId().toString(),
                member.displayName(),
                member.email(),
                member.membership().getRole().name(),
                member.status() == null ? null : member.status().name());
    }
}
