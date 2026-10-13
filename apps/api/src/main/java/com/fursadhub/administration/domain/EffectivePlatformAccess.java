package com.fursadhub.administration.domain;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * The resolved platform authority of one account at one moment (Phase C1). Immutable; produced only
 * by {@link PlatformAccessPolicy}. {@link #sources()} records why each permission is held, which is
 * what a future effective-access preview shows.
 */
public final class EffectivePlatformAccess {

    /** Where a permission came from. */
    public enum Source {
        SUPER_ADMIN,
        VERIFICATION_OFFICER,
        CUSTOM_ROLE,
        DIRECT_GRANT
    }

    private static final EffectivePlatformAccess NONE =
            new EffectivePlatformAccess(false, EnumSet.noneOf(PlatformRole.class), new EnumMap<>(PlatformPermission.class));

    private final boolean superAdmin;
    private final Set<PlatformRole> systemRoles;
    private final Map<PlatformPermission, Set<Source>> sources;

    EffectivePlatformAccess(boolean superAdmin, Set<PlatformRole> systemRoles, Map<PlatformPermission, Set<Source>> sources) {
        this.superAdmin = superAdmin;
        this.systemRoles = Collections.unmodifiableSet(systemRoles.isEmpty()
                ? EnumSet.noneOf(PlatformRole.class) : EnumSet.copyOf(systemRoles));
        EnumMap<PlatformPermission, Set<Source>> copy = new EnumMap<>(PlatformPermission.class);
        sources.forEach((permission, from) -> copy.put(permission, Collections.unmodifiableSet(EnumSet.copyOf(from))));
        this.sources = Collections.unmodifiableMap(copy);
    }

    public static EffectivePlatformAccess none() {
        return NONE;
    }

    public boolean isSuperAdmin() {
        return superAdmin;
    }

    /** Root operations are held by an active SUPER_ADMIN and nobody else. */
    public boolean holds(PlatformRootCapability capability) {
        return superAdmin;
    }

    public boolean has(PlatformPermission permission) {
        return sources.containsKey(permission);
    }

    public Set<PlatformPermission> permissions() {
        return sources.isEmpty() ? Collections.emptySet() : Collections.unmodifiableSet(EnumSet.copyOf(sources.keySet()));
    }

    public Map<PlatformPermission, Set<Source>> sources() {
        return sources;
    }

    public Set<PlatformRole> systemRoles() {
        return systemRoles;
    }

    /** Any platform authority at all. */
    public boolean isPlatformStaff() {
        return superAdmin || !sources.isEmpty();
    }
}
