package com.fursadhub.university.domain;

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
 * A university tenant (CLAUDE.md section 25).
 *
 * <p>Phase 2 seeded the single Jamhuriya pilot row with Flyway and left this entity read-only from
 * Java, because there was exactly one university and no way for another to ask to join. Phase 7.5
 * changes that: universities self-register and pass through the SAME institution-verification gate
 * organizations do (CLAUDE.md section 31), so the entity now owns that frozen state machine itself.
 *
 * <p>Being VERIFIED is load-bearing rather than decorative — an organization cannot target an
 * unverified university with an opportunity ({@code TARGET_UNIVERSITY_NOT_VERIFIED}) — which is why
 * the transitions live here, guarded by their legal source states, instead of anywhere a caller
 * could assign the field directly.
 *
 * <p>{@link #submitForVerification()} additionally requires an attached license document. A review
 * queue entry with nothing to review is not a submission; refusing it here means no HTTP route,
 * present or future, can produce one.
 */
@Entity
@Table(name = "universities")
public class University {

    @Id
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Column(length = 120)
    private String city;

    @Column(name = "registration_number", length = 120)
    private String registrationNumber;

    @Column(length = 255)
    private String website;

    @Column(length = 2000)
    private String description;

    // ------------------------------------------------------------ Backend Phase B2 public profile
    // Optional; null on existing rows. `city`, `website` and `description` above already existed
    // and are reused rather than duplicated.

    /** ISO-3166-1 alpha-2, uppercase. A code, not a name, so it renders in English and Somali. */
    @Column(name = "country_code", length = 2)
    private String countryCode;

    /** An address the university publishes. Never derived from a staff account — see UniversityProfileFields. */
    @Column(name = "public_contact_email", length = 320)
    private String publicContactEmail;

    @Column(name = "cover_stored_file_id")
    private UUID coverStoredFileId;

    @Column(name = "cover_uploaded_at")
    private Instant coverUploadedAt;

    /**
     * The institution verification status. Named {@code status} rather than
     * {@code verificationStatus} because that is the column Phase 2 created; renaming the field would
     * mean a migration that buys nothing.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private InstitutionVerificationStatus status;

    @Column(name = "verified_at")
    private Instant verifiedAt;

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

    protected University() {
    }

    public static University register(
            String name, String slug, String city, String registrationNumber, String website, String description) {
        University university = new University();
        university.id = UUID.randomUUID();
        university.name = name;
        university.slug = slug;
        university.city = city;
        university.registrationNumber = registrationNumber;
        university.website = website;
        university.description = description;
        university.status = InstitutionVerificationStatus.DRAFT;
        university.createdAt = Instant.now();
        university.updatedAt = Instant.now();
        return university;
    }

    /**
     * Replaces the whole editable profile. Every field is assigned, so a null clears the stored
     * value — this method takes the profile's RESOLVED end state, not a request. Which fields an
     * omitted request field may clear is decided in {@code UpdateUniversityService}; see
     * {@link UniversityProfileFields}.
     */
    public void updateProfile(UniversityProfileFields fields) {
        this.name = fields.name();
        this.city = fields.city();
        this.countryCode = fields.countryCode();
        this.registrationNumber = fields.registrationNumber();
        this.website = fields.website();
        this.description = fields.description();
        this.publicContactEmail = fields.publicContactEmail();
        this.updatedAt = Instant.now();
    }

    /** Points the university at its (newly stored) license document, replacing any previous one. */
    public void attachEvidence(UUID storedFileId) {
        this.evidenceStoredFileId = storedFileId;
        this.evidenceUploadedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * Attaches or replaces the university's public profile banner (Backend Phase B2). The previous
     * file is removed by the service, exactly as {@code attachLogo} does.
     */
    public void attachCover(UUID storedFileId) {
        this.coverStoredFileId = storedFileId;
        this.coverUploadedAt = Instant.now();
        this.updatedAt = this.coverUploadedAt;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public String getPublicContactEmail() {
        return publicContactEmail;
    }

    public UUID getCoverStoredFileId() {
        return coverStoredFileId;
    }

    public Instant getCoverUploadedAt() {
        return coverUploadedAt;
    }

    /** Attaches or replaces the university's public logo. The previous file is removed by the service. */
    public void attachLogo(UUID storedFileId) {
        this.logoStoredFileId = storedFileId;
        this.logoUploadedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * Enters the platform review queue.
     *
     * <p>The evidence check runs BEFORE the state check on purpose: a university that submits with
     * nothing attached should be told what is actually missing, not handed a generic
     * "invalid transition" that says nothing about how to fix it.
     */
    public void submitForVerification() {
        if (evidenceStoredFileId == null) {
            throw new ApiException("UNIVERSITY_VERIFICATION_EVIDENCE_REQUIRED", HttpStatus.CONFLICT,
                    "Upload your university's registration or accreditation document before submitting.");
        }
        if (status != InstitutionVerificationStatus.DRAFT
                && status != InstitutionVerificationStatus.NEEDS_CHANGES) {
            throw invalidTransition();
        }
        this.status = InstitutionVerificationStatus.SUBMITTED;
        this.updatedAt = Instant.now();
    }

    public void markUnderReview() {
        if (status != InstitutionVerificationStatus.SUBMITTED) {
            throw invalidTransition();
        }
        this.status = InstitutionVerificationStatus.UNDER_REVIEW;
        this.updatedAt = Instant.now();
    }

    public void requestChanges() {
        if (status != InstitutionVerificationStatus.UNDER_REVIEW) {
            throw invalidTransition();
        }
        this.status = InstitutionVerificationStatus.NEEDS_CHANGES;
        this.updatedAt = Instant.now();
    }

    public void verify() {
        if (status != InstitutionVerificationStatus.UNDER_REVIEW
                && status != InstitutionVerificationStatus.SUBMITTED) {
            throw invalidTransition();
        }
        this.status = InstitutionVerificationStatus.VERIFIED;
        this.verifiedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void reject() {
        if (status != InstitutionVerificationStatus.UNDER_REVIEW
                && status != InstitutionVerificationStatus.SUBMITTED) {
            throw invalidTransition();
        }
        this.status = InstitutionVerificationStatus.REJECTED;
        this.updatedAt = Instant.now();
    }

    public void suspend() {
        if (status != InstitutionVerificationStatus.VERIFIED) {
            throw invalidTransition();
        }
        this.status = InstitutionVerificationStatus.SUSPENDED;
        this.updatedAt = Instant.now();
    }

    public void revoke() {
        if (status != InstitutionVerificationStatus.VERIFIED
                && status != InstitutionVerificationStatus.SUSPENDED) {
            throw invalidTransition();
        }
        this.status = InstitutionVerificationStatus.REVOKED;
        this.updatedAt = Instant.now();
    }

    public boolean isVerified() {
        return status == InstitutionVerificationStatus.VERIFIED;
    }

    private ApiException invalidTransition() {
        return new ApiException("UNIVERSITY_VERIFICATION_INVALID_TRANSITION", HttpStatus.CONFLICT,
                "This university verification status change is not allowed from its current state.");
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

    public String getCity() {
        return city;
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

    public InstitutionVerificationStatus getStatus() {
        return status;
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
