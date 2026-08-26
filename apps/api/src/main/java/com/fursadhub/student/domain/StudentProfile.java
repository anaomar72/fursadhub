package com.fursadhub.student.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Student-specific profile fields layered on top of {@code identity.domain.User} (CLAUDE.md
 * section 28). The primary key is the owning user's id — a student has exactly one profile.
 */
@Entity
@Table(name = "student_profiles")
public class StudentProfile {

    @Id
    private UUID userId;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(length = 40)
    private String phone;

    /**
     * The student's current CV (Phase 7). Private: never a public URL, and readable only by the
     * student and by recruiters at organizations where the student has a candidacy
     * (CLAUDE.md section 47).
     */
    @Column(name = "cv_stored_file_id")
    private UUID cvStoredFileId;

    @Column(name = "cv_uploaded_at")
    private Instant cvUploadedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudentProfile() {
    }

    /** Points the profile at a new CV, or clears it when the student removes theirs. */
    public void attachCv(UUID storedFileId) {
        this.cvStoredFileId = storedFileId;
        this.cvUploadedAt = storedFileId == null ? null : Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getCvStoredFileId() {
        return cvStoredFileId;
    }

    public Instant getCvUploadedAt() {
        return cvUploadedAt;
    }

    public static StudentProfile create(UUID userId, String fullName, String phone) {
        Instant now = Instant.now();
        StudentProfile profile = new StudentProfile();
        profile.userId = userId;
        profile.fullName = fullName;
        profile.phone = phone;
        profile.createdAt = now;
        profile.updatedAt = now;
        return profile;
    }

    public void update(String fullName, String phone) {
        this.fullName = fullName;
        this.phone = phone;
        this.updatedAt = Instant.now();
    }

    public UUID getUserId() {
        return userId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPhone() {
        return phone;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
