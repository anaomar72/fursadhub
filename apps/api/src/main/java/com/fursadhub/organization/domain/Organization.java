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

    // ------------------------------------------------------------ Backend Phase B2 public profile
    // Every field below is optional and starts null on existing rows.

    /** The organization's sector in its own words. Free text, not {@link OrganizationType}. */
    @Column(length = 120)
    private String industry;

    @Column(length = 120)
    private String city;

    /** ISO-3166-1 alpha-2, uppercase. A code, not a name, so it renders in English and Somali. */
    @Column(name = "country_code", length = 2)
    private String countryCode;

    /** One-line summary for directory cards. {@link #description} remains the full profile body. */
    @Column(name = "short_description", length = 200)
    private String shortDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_size_range", length = 20)
    private CompanySizeRange companySizeRange;

    @Column(name = "founded_year")
    private Integer foundedYear;

    @Column(name = "linkedin_url", length = 255)
    private String linkedinUrl;

    @Column(name = "x_url", length = 255)
    private String xUrl;

    @Column(name = "instagram_url", length = 255)
    private String instagramUrl;

    @Column(name = "youtube_url", length = 255)
    private String youtubeUrl;

    @Column(name = "cover_stored_file_id")
    private UUID coverStoredFileId;

    @Column(name = "cover_uploaded_at")
    private Instant coverUploadedAt;

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

    /**
     * Replaces the whole editable profile (Backend Phase B2 widened this from four fields to
     * fourteen). Every field is assigned, so a null clears the stored value — this method takes the
     * profile's RESOLVED end state, not a request.
     *
     * <p>Which fields an omitted request field is allowed to clear is decided one layer up, in
     * {@code UpdateOrganizationService}: pre-B2 fields keep full-replacement semantics, and B2 fields
     * are resolved against what is stored. See {@link OrganizationProfileFields}.
     */
    public void updateProfile(OrganizationProfileFields fields) {
        this.name = fields.name();
        this.registrationNumber = fields.registrationNumber();
        this.website = fields.website();
        this.description = fields.description();
        this.industry = fields.industry();
        this.city = fields.city();
        this.countryCode = fields.countryCode();
        this.shortDescription = fields.shortDescription();
        this.companySizeRange = fields.companySizeRange();
        this.foundedYear = fields.foundedYear();
        this.linkedinUrl = fields.linkedinUrl();
        this.xUrl = fields.xUrl();
        this.instagramUrl = fields.instagramUrl();
        this.youtubeUrl = fields.youtubeUrl();
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
     * Attaches or replaces the organization's public profile banner (Backend Phase B2). The previous
     * file is removed by the service, exactly as {@link #attachLogo} does.
     */
    public void attachCover(UUID storedFileId) {
        this.coverStoredFileId = storedFileId;
        this.coverUploadedAt = Instant.now();
        this.updatedAt = this.coverUploadedAt;
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

    // ------------------------------------------------------------ Backend Phase B2 accessors

    public String getIndustry() {
        return industry;
    }

    public String getCity() {
        return city;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public String getShortDescription() {
        return shortDescription;
    }

    public CompanySizeRange getCompanySizeRange() {
        return companySizeRange;
    }

    public Integer getFoundedYear() {
        return foundedYear;
    }

    public String getLinkedinUrl() {
        return linkedinUrl;
    }

    public String getXUrl() {
        return xUrl;
    }

    public String getInstagramUrl() {
        return instagramUrl;
    }

    public String getYoutubeUrl() {
        return youtubeUrl;
    }

    public UUID getCoverStoredFileId() {
        return coverStoredFileId;
    }

    public Instant getCoverUploadedAt() {
        return coverUploadedAt;
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
