package com.fursadhub.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A FursadHub account. Contextual roles/memberships (student, university staff, organization
 * staff, admin) are separate concerns layered on top starting Phase 2+ (CLAUDE.md section 23) —
 * this entity only carries identity/authentication state.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private UserStatus status;

    @Column(name = "preferred_locale", nullable = false, length = 5)
    private String preferredLocale;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "avatar_stored_file_id")
    private UUID avatarStoredFileId;

    @Column(name = "avatar_uploaded_at")
    private Instant avatarUploadedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {
    }

    public static User register(String normalizedEmail, String passwordHash, String preferredLocale) {
        Instant now = Instant.now();
        User user = new User();
        user.id = UUID.randomUUID();
        user.email = normalizedEmail;
        user.passwordHash = passwordHash;
        user.status = UserStatus.PENDING_CONTACT_VERIFICATION;
        user.preferredLocale = preferredLocale;
        user.createdAt = now;
        user.updatedAt = now;
        return user;
    }

    public void markEmailVerified() {
        this.emailVerifiedAt = Instant.now();
        if (this.status == UserStatus.PENDING_CONTACT_VERIFICATION) {
            this.status = UserStatus.ACTIVE;
        }
        this.updatedAt = Instant.now();
    }

    public void changePasswordHash(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
        this.updatedAt = Instant.now();
    }

    /** Blocks authentication without destroying the account. Driven by the Phase 7 admin console. */
    public void suspend() {
        this.status = UserStatus.SUSPENDED;
        this.updatedAt = Instant.now();
    }

    /**
     * Lifts a suspension (Phase 7 admin console).
     *
     * <p>Only ever from SUSPENDED, and it returns false rather than throwing when the account is in
     * any other state, so the caller decides what that means. A CLOSED account stays closed —
     * closure is the user's own decision about their account and an administrator must not be able
     * to silently reopen it. An account suspended before it ever verified its email returns to
     * PENDING_CONTACT_VERIFICATION rather than ACTIVE, so reactivation can never be used to skip
     * email verification (CLAUDE.md section 13).
     */
    public boolean reactivate() {
        if (this.status != UserStatus.SUSPENDED) {
            return false;
        }
        this.status = isEmailVerified() ? UserStatus.ACTIVE : UserStatus.PENDING_CONTACT_VERIFICATION;
        this.updatedAt = Instant.now();
        return true;
    }

    /** Closes the account permanently. Driven by the Phase 7 admin console. */
    public void close() {
        this.status = UserStatus.CLOSED;
        this.updatedAt = Instant.now();
    }

    public boolean isEmailVerified() {
        return emailVerifiedAt != null;
    }

    /** Points the account at its (newly stored) profile picture, replacing any previous one. */
    public void attachAvatar(UUID storedFileId) {
        this.avatarStoredFileId = storedFileId;
        this.avatarUploadedAt = Instant.now();
        this.updatedAt = this.avatarUploadedAt;
    }

    public UUID getAvatarStoredFileId() {
        return avatarStoredFileId;
    }

    public Instant getAvatarUploadedAt() {
        return avatarUploadedAt;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public UserStatus getStatus() {
        return status;
    }

    public String getPreferredLocale() {
        return preferredLocale;
    }

    public Instant getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
