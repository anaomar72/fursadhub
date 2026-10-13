package com.fursadhub.administration.infrastructure.persistence;

import com.fursadhub.administration.domain.PlatformAccessRepository;
import com.fursadhub.administration.domain.PlatformAccessSnapshot;
import com.fursadhub.administration.domain.PlatformRole;
import com.fursadhub.identity.domain.UserStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Loads a {@link PlatformAccessSnapshot} in two indexed queries (Phase C1), always from current
 * PostgreSQL data — there is deliberately no cache, so a revocation takes effect on the very next
 * resolution rather than when some cache entry expires.
 *
 * <p>Cross-module SQL for the same reason as {@code JdbcPlatformStatisticsRepository}: the
 * "is this a dedicated platform identity?" question spans membership and enrollment tables owned by
 * other modules, and one read-only query answers it without coupling to their repositories.
 */
@Repository
class JdbcPlatformAccessRepository implements PlatformAccessRepository {

    private static final String ACCOUNT_SQL = """
            SELECT u.status,
                   (EXISTS (SELECT 1 FROM university_memberships m WHERE m.user_id = u.id AND m.revoked_at IS NULL)
                    OR EXISTS (SELECT 1 FROM organization_memberships m WHERE m.user_id = u.id AND m.revoked_at IS NULL)
                    OR EXISTS (SELECT 1 FROM student_enrollments e WHERE e.student_user_id = u.id)) AS tenant_ties
            FROM users u
            WHERE u.id = ?
            """;

    /**
     * Active grants only. A custom role contributes only while the assignment is unrevoked AND the
     * role itself is active, so deactivating a role removes it from every holder at once.
     */
    private static final String GRANTS_SQL = """
            SELECT 'SYSTEM' AS source, p.role AS code
              FROM platform_admins p
             WHERE p.user_id = ? AND p.revoked_at IS NULL
            UNION ALL
            SELECT 'CUSTOM', rp.permission
              FROM platform_staff_role_assignments a
              JOIN platform_custom_roles r ON r.id = a.custom_role_id AND r.active
              JOIN platform_custom_role_permissions rp ON rp.role_id = r.id
             WHERE a.user_id = ? AND a.revoked_at IS NULL
            UNION ALL
            SELECT 'DIRECT', g.permission
              FROM platform_staff_permission_grants g
             WHERE g.user_id = ? AND g.revoked_at IS NULL
            """;

    private final JdbcTemplate jdbcTemplate;

    JdbcPlatformAccessRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public PlatformAccessSnapshot load(UUID userId) {
        List<Map<String, Object>> account = jdbcTemplate.queryForList(ACCOUNT_SQL, userId);
        if (account.isEmpty()) {
            return new PlatformAccessSnapshot(null, false, Set.of(), Set.of(), Set.of());
        }
        UserStatus status = parseStatus((String) account.get(0).get("status"));
        boolean tenantTies = Boolean.TRUE.equals(account.get(0).get("tenant_ties"));

        Set<PlatformRole> systemRoles = EnumSet.noneOf(PlatformRole.class);
        Set<String> custom = new HashSet<>();
        Set<String> direct = new HashSet<>();
        jdbcTemplate.query(GRANTS_SQL, rs -> {
            String source = rs.getString("source");
            String code = rs.getString("code");
            switch (source) {
                case "SYSTEM" -> parseRole(code, systemRoles);
                case "CUSTOM" -> custom.add(code);
                case "DIRECT" -> direct.add(code);
                default -> { }
            }
        }, userId, userId, userId);

        return new PlatformAccessSnapshot(status, tenantTies, systemRoles, custom, direct);
    }

    /** An unrecognised status fails closed: the policy treats anything but ACTIVE as no access. */
    private static UserStatus parseStatus(String raw) {
        try {
            return raw == null ? null : UserStatus.valueOf(raw);
        } catch (IllegalArgumentException unknown) {
            return null;
        }
    }

    private static void parseRole(String raw, Set<PlatformRole> into) {
        try {
            into.add(PlatformRole.valueOf(raw));
        } catch (IllegalArgumentException | NullPointerException unknown) {
            // V31's CHECK makes this unreachable; ignoring an unknown role fails closed.
        }
    }
}
