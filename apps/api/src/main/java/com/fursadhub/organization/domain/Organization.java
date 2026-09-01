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
 * later SUSPENDED/REVOKED) is driven by a platform reviewer (SUPER_ADMIN/VERIFICATION_OFFICER)
 * through the Phase 7 admin console. The transitions live here rather than in that console so the
 * frozen state machine (CLAUDE.md section 31) is enforced in one place regardless of which endpoint
 * calls it — connecting an endpoint to a state machine must never loosen it.
 *
 * <p>Phase 7.5 added the registration license the reviewer actually reads. It is a precondition of
 * {@link #submitForVerification()} rather than of registration, so signing up stays a plain JSON
 * call and the upload stays multipart; the effect is the same, because nothing reaches a reviewer's
 * queue without it.
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

    /**
     * The registration/business license backing the verification claim (Phase 7.5). Private: readable
     * only by this organization's own members and by platform reviewers, never through a URL
     * (CLAUDE.md sections 31, 47).
     */
    @Column(name = "evidence_stored_file_id")
    private UUID evidenceStoredFileId;

    @Column(name = "evidence_uploaded_at")
    private Instant evidenceUploadedAt;

    @Column(name = "logo_stored_file_id")
    private UUID logoStoredFileId;

    @Column(name = "logo_uploaded_at")
    private Instant logoUploadedAt;

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

    /** Attaches or replaces the license document. The previous file is removed by the service. */
    public void attachEvidence(UUID storedFileId) {
        this.evidenceStoredFileId = storedFileId;
        this.evidenceUploadedAt = Instant.now();
        this.updatedAt = this.evidenceUploadedAt;
    }

    /** Attaches or replaces the organization's public logo. The previous file is removed by the service. */
    public void attachLogo(UUID storedFileId) {
        this.logoStoredFileId = storedFileId;
        this.logoUploadedAt = Instant.now();
        this.updatedAt = this.logoUploadedAt;
    }

    /**
     * Hands the organization to the platform review queue.
     *
     * <p>The evidence check comes first on purpose: "you have not attached your license yet" is the
     * accurate answer for a DRAFT organization with nothing on file, and reporting an invalid
     * transition instead would send the registrant looking for a state problem they do not have.
     */
    public void submitForVerification() {
        if (evidenceStoredFileId == null) {
            throw new ApiException("ORGANIZATION_VERIFICATION_EVIDENCE_REQUIRED", HttpStatus.CONFLICT,
                    "Attach your registration license before submitting for verification.");
        }
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

    public UUID getEvidenceStoredFileId() {
        return evidenceStoredFileId;
    }

    public Instant getEvidenceUploadedAt() {
        return evidenceUploadedAt;
    }

    public UUID getLogoStoredFileId() {
        return logoStoredFileId;
    }

    public Instant getLogoUploadedAt() {
        return logoUploadedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
