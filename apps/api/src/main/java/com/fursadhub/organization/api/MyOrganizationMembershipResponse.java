package com.fursadhub.organization.api;

import com.fursadhub.organization.domain.OrganizationMembership;

public record MyOrganizationMembershipResponse(String organizationId, String role) {

    public static MyOrganizationMembershipResponse from(OrganizationMembership membership) {
        return new MyOrganizationMembershipResponse(membership.getOrganizationId().toString(), membership.getRole().name());
    }
}
