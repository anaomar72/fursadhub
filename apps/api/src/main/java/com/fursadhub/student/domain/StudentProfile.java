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

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudentProfile() {
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
