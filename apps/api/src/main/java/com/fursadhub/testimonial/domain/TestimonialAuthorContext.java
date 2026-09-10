package com.fursadhub.testimonial.domain;

import java.util.UUID;

/**
 * Who the author is, as the server determined it — the whole attribution, resolved in one place and
 * frozen into the testimonial at submission.
 *
 * <p>Every field here comes from current PostgreSQL data about the AUTHENTICATED caller. None of it
 * is accepted from the request body, which is the entire point: the public site's "Recruiter at
 * Acme Ltd" line is a statement FursadHub is making, not one the author typed.
 *
 * @param role the author's real role
 * @param tenantType the kind of tenant they were acting for, or null (students, platform staff)
 * @param tenantId a stable reference to that tenant, or null — always null exactly when
 *     {@code tenantType} is, matching the database CHECK added in V52
 * @param tenantDisplayName the tenant's name AS IT WAS at submission, or null; snapshotted so a
 *     renamed or departed tenant cannot silently rewrite a published attribution
 */
public record TestimonialAuthorContext(
        TestimonialAuthorRole role,
        TestimonialTenantType tenantType,
        UUID tenantId,
        String tenantDisplayName) {

    public TestimonialAuthorContext {
        if (role == null) {
            throw new IllegalArgumentException("A testimonial author context always has a role.");
        }
        if ((tenantType == null) != (tenantId == null)) {
            throw new IllegalArgumentException("Tenant type and tenant id are present together or not at all.");
        }
    }

    /** A student or a member of FursadHub's own staff: nobody's tenant is being represented. */
    public static TestimonialAuthorContext untenanted(TestimonialAuthorRole role) {
        return new TestimonialAuthorContext(role, null, null, null);
    }

    public static TestimonialAuthorContext of(
            TestimonialAuthorRole role, TestimonialTenantType tenantType, UUID tenantId, String tenantDisplayName) {
        return new TestimonialAuthorContext(role, tenantType, tenantId, tenantDisplayName);
    }

    public TestimonialAudience audience() {
        return role.audience();
    }
}
