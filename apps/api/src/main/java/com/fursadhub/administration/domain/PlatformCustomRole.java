package com.fursadhub.administration.domain;

import com.fursadhub.common.api.ApiException;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Collection;
import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

/**
 * A named bundle of grantable {@link PlatformPermission}s (Phase C1).
 *
 * <p>Never deleted: deactivation stops it contributing permissions on the very next resolution while
 * keeping the row — and every assignment that referenced it — for audit.
 *
 * <p>{@link Version} makes concurrent edits safe. The permission set is an owned collection, so
 * changing it increments the version too: of two administrators editing the same role, the second
 * save fails instead of silently replacing the first one's permissions.
 */
@Entity
@Table(name = "platform_custom_roles")
public class PlatformCustomRole {

    public static final int NAME_MAX_LENGTH = 80;
    public static final int DESCRIPTION_MAX_LENGTH = 500;

    @Id
    private UUID id;

    @Column(nullable = false, length = NAME_MAX_LENGTH)
    private String name;

    @Column(length = DESCRIPTION_MAX_LENGTH)
    private String description;

    @Column(nullable = false)
    private boolean active;

    @Version
    @Column(nullable = false)
    private long version;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "platform_custom_role_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission", nullable = false, length = 60)
    @Enumerated(EnumType.STRING)
    private Set<PlatformPermission> permissions = EnumSet.noneOf(PlatformPermission.class);

    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deactivated_at")
    private Instant deactivatedAt;

    @Column(name = "deactivated_by_user_id")
    private UUID deactivatedByUserId;

    protected PlatformCustomRole() {
    }

    public static PlatformCustomRole create(
            String name, String description, Collection<PlatformPermission> permissions, UUID createdByUserId) {
        PlatformCustomRole role = new PlatformCustomRole();
        role.id = UUID.randomUUID();
        role.name = normalizeName(name);
        role.description = normalizeDescription(description);
        role.active = true;
        role.permissions = requireGrantable(permissions);
        role.createdByUserId = createdByUserId;
        role.createdAt = Instant.now();
        role.updatedAt = role.createdAt;
        return role;
    }

    /** Replaces the whole permission set. Refused on a deactivated role. */
    public void replacePermissions(Collection<PlatformPermission> next) {
        requireActive();
        EnumSet<PlatformPermission> validated = requireGrantable(next);
        // Mutate the managed collection in place so Hibernate sees an owned-collection change and
        // increments the version.
        permissions.clear();
        permissions.addAll(validated);
        updatedAt = Instant.now();
    }

    public void rename(String nextName, String nextDescription) {
        requireActive();
        name = normalizeName(nextName);
        description = normalizeDescription(nextDescription);
        updatedAt = Instant.now();
    }

    /** Idempotent. A deactivated role contributes nothing from the next resolution onward. */
    public void deactivate(UUID actingUserId) {
        if (!active) {
            return;
        }
        active = false;
        deactivatedAt = Instant.now();
        deactivatedByUserId = actingUserId;
        updatedAt = deactivatedAt;
    }

    private void requireActive() {
        if (!active) {
            throw new ApiException("PLATFORM_CUSTOM_ROLE_INACTIVE", HttpStatus.CONFLICT,
                    "A deactivated role cannot be changed.");
        }
    }

    private static EnumSet<PlatformPermission> requireGrantable(Collection<PlatformPermission> requested) {
        EnumSet<PlatformPermission> result = EnumSet.noneOf(PlatformPermission.class);
        if (requested == null || requested.isEmpty()) {
            throw new ApiException("PLATFORM_CUSTOM_ROLE_EMPTY", HttpStatus.BAD_REQUEST,
                    "A role must contain at least one permission.");
        }
        for (PlatformPermission permission : requested) {
            if (permission == null || !permission.isGrantable()) {
                throw new ApiException("PLATFORM_PERMISSION_NOT_GRANTABLE", HttpStatus.BAD_REQUEST,
                        "That permission cannot be assigned.");
            }
            result.add(permission);
        }
        return result;
    }

    private static String normalizeName(String raw) {
        String trimmed = raw == null ? "" : raw.strip();
        if (trimmed.length() < 2 || trimmed.length() > NAME_MAX_LENGTH) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "A role name must be between 2 and " + NAME_MAX_LENGTH + " characters.");
        }
        String collapsed = trimmed.replaceAll("[\\s_-]+", "").toLowerCase(java.util.Locale.ROOT);
        if (collapsed.equals("superadmin") || collapsed.equals("verificationofficer")) {
            throw new ApiException("PLATFORM_CUSTOM_ROLE_NAME_RESERVED", HttpStatus.BAD_REQUEST,
                    "That name is reserved for a system role.");
        }
        return trimmed;
    }

    private static String normalizeDescription(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.strip();
        if (trimmed.length() > DESCRIPTION_MAX_LENGTH) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "A role description must be at most " + DESCRIPTION_MAX_LENGTH + " characters.");
        }
        return trimmed;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public boolean isActive() {
        return active;
    }

    public long getVersion() {
        return version;
    }

    public Set<PlatformPermission> getPermissions() {
        return Collections.unmodifiableSet(permissions);
    }

    public UUID getCreatedByUserId() {
        return createdByUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getDeactivatedAt() {
        return deactivatedAt;
    }

    public UUID getDeactivatedByUserId() {
        return deactivatedByUserId;
    }
}
