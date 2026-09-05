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

    /**
     * A human-readable name for managed institution staff (Backend Phase B5) — presentation only.
     *
     * <p>Never an identifier: not unique, never used to look an account up, and with zero effect on
     * login, the JWT subject, refresh tokens, the password hash, account status, or membership/role
     * authorization. {@link #email} remains the account and login field.
     *
     * <p>Null for every account that has not been given one, which includes every account created
     * before B5. Nothing derives it from the email address.
     *
     * <p>Deliberately NOT the student name: students keep {@code StudentProfile.full_name}, which
     * they manage themselves. The two can coexist on a self-registered account that is both, and B5
     * does not reconcile them.
     */
    @Column(name = "display_name", length = 255)
    private String displayName;

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

    /**
     * Sets or clears the display name (Backend Phase B5). Null clears it; the caller has already
     * normalised through {@link DisplayNamePolicy}.
     *
     * <p>Authorization for WHO may call this is not a concern of the entity — it lives in the
     * tenant-scoped staff services, which resolve the target through a membership they own and
     * refuse any role outside the managed-staff set.
     */
    public void changeDisplayName(String normalizedDisplayName) {
        this.displayName = normalizedDisplayName;
        this.updatedAt = Instant.now();
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

    /** Null when this account has never been given a display name (Backend Phase B5). */
    public String getDisplayName() {
        return displayName;
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
