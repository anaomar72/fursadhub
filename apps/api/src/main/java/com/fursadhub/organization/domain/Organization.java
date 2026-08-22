package com.fursadhub.organization.domain;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * An organization tenant (CLAUDE.md section 26): a company/NGO/government body/other that
 * publishes internship opportunities. Unlike {@code University} (a fixed pilot tenant seeded once
 * by Flyway — see its Javadoc), organizations are created dynamically through self-service
 * registration, so this entity owns its own institution-verification state machine
 * (CLAUDE.md section 31) rather than being read-only from Java.
 *
 * <p>Reviewing a submitted organization (SUBMITTED -&gt; UNDER_REVIEW -&gt; VERIFIED/REJECTED, or
 * later SUSPENDED/REVOKED) requires a privileged reviewer actor (SUPER_ADMIN/VERIFICATION_OFFICER)
 * that does not exist yet in this codebase — that role and the admin console are Phase 7 scope
 * (docs/CLAUDE_IMPLEMENTATION_PHASES.md Phase 7 "Admin: institution verification"). Phase 3
 * therefore only wires the organization's own {@link #submitForVerification()} transition to an
 * HTTP endpoint; the remaining transitions are implemented here as centralized/testable domain
 * logic (CLAUDE.md section 75) ready for Phase 7 to call.
 */
@Entity
@Table(name = "organizations")
public class Organization {

    @Id
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrganizationType type;

    @Column(name = "registration_number", length = 120)
    private String registrationNumber;

    @Column(length = 255)
    private String website;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 40)
    private InstitutionVerificationStatus verificationStatus;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Organization() {
    }

    public static Organization create(
            String name, String slug, OrganizationType type, String registrationNumber, String website, String description) {
        Organization organization = new Organization();
        organization.id = UUID.randomUUID();
        organization.name = name;
        organization.slug = slug;
        organization.type = type;
        organization.registrationNumber = registrationNumber;
        organization.website = website;
        organization.description = description;
        organization.verificationStatus = InstitutionVerificationStatus.DRAFT;
        organization.createdAt = Instant.now();
        organization.updatedAt = Instant.now();
        return organization;
    }

    public void updateProfile(String name, String registrationNumber, String website, String description) {
        this.name = name;
        this.registrationNumber = registrationNumber;
        this.website = website;
        this.description = description;
        this.updatedAt = Instant.now();
    }

    public void submitForVerification() {
        if (verificationStatus != InstitutionVerificationStatus.DRAFT
                && verificationStatus != InstitutionVerificationStatus.NEEDS_CHANGES) {
            throw invalidTransition();
        }
        this.verificationStatus = InstitutionVerificationStatus.SUBMITTED;
        this.updatedAt = Instant.now();
    }

    public void markUnderReview() {
        if (verificationStatus != InstitutionVerificationStatus.SUBMITTED) {
            throw invalidTransition();
        }
        this.verificationStatus = InstitutionVerificationStatus.UNDER_REVIEW;
        this.updatedAt = Instant.now();
    }

    public void requestChanges() {
        if (verificationStatus != InstitutionVerificationStatus.UNDER_REVIEW) {
            throw invalidTransition();
        }
        this.verificationStatus = InstitutionVerificationStatus.NEEDS_CHANGES;
        this.updatedAt = Instant.now();
    }

    public void verify() {
        if (verificationStatus != InstitutionVerificationStatus.UNDER_REVIEW
                && verificationStatus != InstitutionVerificationStatus.SUBMITTED) {
            throw invalidTransition();
        }
        this.verificationStatus = InstitutionVerificationStatus.VERIFIED;
        this.verifiedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void reject() {
        if (verificationStatus != InstitutionVerificationStatus.UNDER_REVIEW
                && verificationStatus != InstitutionVerificationStatus.SUBMITTED) {
            throw invalidTransition();
        }
        this.verificationStatus = InstitutionVerificationStatus.REJECTED;
        this.updatedAt = Instant.now();
    }

    public void suspend() {
        if (verificationStatus != InstitutionVerificationStatus.VERIFIED) {
            throw invalidTransition();
        }
        this.verificationStatus = InstitutionVerificationStatus.SUSPENDED;
        this.updatedAt = Instant.now();
    }

    public void revoke() {
        if (verificationStatus != InstitutionVerificationStatus.VERIFIED
                && verificationStatus != InstitutionVerificationStatus.SUSPENDED) {
            throw invalidTransition();
        }
        this.verificationStatus = InstitutionVerificationStatus.REVOKED;
        this.updatedAt = Instant.now();
    }

    public boolean isVerified() {
        return verificationStatus == InstitutionVerificationStatus.VERIFIED;
    }

    private ApiException invalidTransition() {
        return new ApiException("ORGANIZATION_VERIFICATION_INVALID_TRANSITION", HttpStatus.CONFLICT,
                "This organization verification status change is not allowed from its current state.");
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSlug() {
        return slug;
    }

    public OrganizationType getType() {
        return type;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public String getWebsite() {
        return website;
    }

    public String getDescription() {
        return description;
    }

    public InstitutionVerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public Instant getVerifiedAt() {
        return verifiedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
