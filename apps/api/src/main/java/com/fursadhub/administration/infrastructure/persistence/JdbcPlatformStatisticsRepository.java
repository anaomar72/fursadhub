package com.fursadhub.administration.infrastructure.persistence;

import com.fursadhub.administration.domain.PlatformStatistics;
import com.fursadhub.administration.domain.PlatformStatisticsRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Aggregate counts for the admin dashboard, read straight from PostgreSQL.
 *
 * <p>JDBC rather than JPA on purpose. These are ten {@code GROUP BY} counts across eight tables that
 * belong to eight different modules; expressing them through the domain repositories would mean
 * adding a count method to each one — permanently widening eight ports for a read that only the
 * dashboard performs. A dedicated read model keeps that pressure off the domain, which is the usual
 * reason to reach for one.
 *
 * <p>Strictly read-only, and it selects nothing but counts: no identifiers, no names, no rows.
 */
@Repository
class JdbcPlatformStatisticsRepository implements PlatformStatisticsRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcPlatformStatisticsRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public PlatformStatistics collect() {
        return new PlatformStatistics(
                countGrouped("users", "status"),
                count("SELECT count(*) FROM universities"),
                countGrouped("organizations", "verification_status"),
                countGrouped("internship_opportunities", "status"),
                count("SELECT count(*) FROM candidacies"),
                countGrouped("placements", "status"),
                count("SELECT count(*) FROM privacy_requests WHERE state IN ('SUBMITTED', 'IN_REVIEW')"),
                count("SELECT count(*) FROM student_verification_cases WHERE escalated_at IS NOT NULL "
                        + "AND status NOT IN ('VERIFIED', 'REJECTED', 'REVOKED')"),
                count("SELECT count(*) FROM email_outbox WHERE status = 'FAILED'"),
                count("SELECT count(*) FROM audit_events WHERE event_type = 'LOGIN_FAILURE' AND occurred_at >= ?",
                        java.sql.Timestamp.from(Instant.now().minus(24, ChronoUnit.HOURS))));
    }

    /**
     * Table and column names are compile-time constants from this class only — never anything that
     * reaches the request. Values are always bound as parameters.
     */
    private Map<String, Long> countGrouped(String table, String column) {
        Map<String, Long> counts = new LinkedHashMap<>();
        jdbcTemplate.query(
                "SELECT " + column + " AS key, count(*) AS total FROM " + table + " GROUP BY " + column
                        + " ORDER BY " + column,
                rs -> {
                    counts.put(rs.getString("key"), rs.getLong("total"));
                });
        return counts;
    }

    private long count(String sql, Object... args) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class, args);
        return value == null ? 0L : value;
    }
}
