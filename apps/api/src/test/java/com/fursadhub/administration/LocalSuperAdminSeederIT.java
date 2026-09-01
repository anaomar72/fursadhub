package com.fursadhub.administration;

import com.fursadhub.administration.application.LocalSuperAdminSeeder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves {@link LocalSuperAdminSeeder} end to end (CLAUDE.md section 60), against its OWN Spring
 * context with the {@code local} profile active — the profile the seeder is gated on. Every other
 * *IT class in this suite deliberately runs under {@code test} only, so this is a separate context
 * (and its own Testcontainers Postgres) rather than added to the shared fixture hierarchy.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles({"test", "local"})
@Testcontainers
class LocalSuperAdminSeederIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("fursadhub_local_seed_test")
            .withUsername("fursadhub_test")
            .withPassword("fursadhub_test");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    private static final String SEEDED_EMAIL = "admin@fursadhub.local";
    private static final String SEEDED_PASSWORD = "SuperAdmin!2026";
    private static final Pattern VERIFICATION_CODE_PATTERN = Pattern.compile("\\b(\\d{4})\\b");

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Plain JDK request factory with lenient error handling, matching AbstractIdentityIT: these
    // tests assert on 403/201 status codes directly rather than catching thrown exceptions.
    private final RestTemplate restTemplate = buildStatelessRestTemplate();

    private static RestTemplate buildStatelessRestTemplate() {
        RestTemplate template = new RestTemplate(new JdkClientHttpRequestFactory());
        template.setErrorHandler(new ResponseErrorHandler() {
            @Override
            public boolean hasError(ClientHttpResponse response) {
                return false;
            }

            @Override
            public void handleError(ClientHttpResponse response) {
            }
        });
        return template;
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    @Test
    @DisplayName("Startup seeds exactly one admin@fursadhub.local with a hashed password and an active SUPER_ADMIN grant")
    void seedsExactlyOneHashedSuperAdmin() {
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT id, password_hash, status FROM users WHERE email = ?", SEEDED_EMAIL);

        assertThat(row.get("password_hash")).asString().isNotEqualTo(SEEDED_PASSWORD);
        assertThat(passwordEncoder.matches(SEEDED_PASSWORD, (String) row.get("password_hash"))).isTrue();
        assertThat(row.get("status")).isEqualTo("ACTIVE");

        Integer userCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM users WHERE email = ?", Integer.class, SEEDED_EMAIL);
        assertThat(userCount).isEqualTo(1);

        Integer grantCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM platform_admins WHERE user_id = ? AND role = 'SUPER_ADMIN' AND revoked_at IS NULL",
                Integer.class, row.get("id"));
        assertThat(grantCount).isEqualTo(1);
    }

    @Test
    @DisplayName("Re-running the seeder against an already-seeded database is a no-op, not a duplicate")
    void rerunningTheSeederDoesNotDuplicate() {
        seeder.run(null);
        seeder.run(null);

        Integer userCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM users WHERE email = ?", Integer.class, SEEDED_EMAIL);
        Integer grantCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM platform_admins WHERE role = 'SUPER_ADMIN' AND revoked_at IS NULL",
                Integer.class);

        assertThat(userCount).isEqualTo(1);
        assertThat(grantCount).isEqualTo(1);
    }

    @Test
    @DisplayName("The seeded account logs in through the normal pipeline and reaches a SUPER_ADMIN-only endpoint")
    void seededAccountAuthenticatesAndHasSuperAdminAccess() {
        ResponseEntity<Map> login = restTemplate.postForEntity(
                url("/api/v1/auth/login"), Map.of("email", SEEDED_EMAIL, "password", SEEDED_PASSWORD), Map.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        String accessToken = (String) login.getBody().get("accessToken");

        ResponseEntity<Map> statistics = authorizedGet("/api/v1/admin/statistics", accessToken);
        assertThat(statistics.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("An ordinary registered account is refused on the same SUPER_ADMIN-only endpoint")
    void ordinaryAccountIsRefusedOnTheSameEndpoint() {
        String email = "seeder-check-" + java.util.UUID.randomUUID() + "@example.test";
        String password = "Password123";

        ResponseEntity<Map> register = restTemplate.postForEntity(
                url("/api/v1/auth/register"), Map.of("email", email, "password", password), Map.class);
        assertThat(register.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        String code = latestVerificationCodeFor(email);
        ResponseEntity<Map> verify = restTemplate.postForEntity(
                url("/api/v1/auth/email/verify"), Map.of("email", email, "code", code), Map.class);
        assertThat(verify.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> login = restTemplate.postForEntity(
                url("/api/v1/auth/login"), Map.of("email", email, "password", password), Map.class);
        String accessToken = (String) login.getBody().get("accessToken");

        ResponseEntity<Map> statistics = authorizedGet("/api/v1/admin/statistics", accessToken);
        assertThat(statistics.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("A direct registration request cannot grant itself SUPER_ADMIN, even with an extra role field")
    void registrationCannotSelfGrantSuperAdmin() {
        String email = "role-injection-" + java.util.UUID.randomUUID() + "@example.test";

        ResponseEntity<Map> register = restTemplate.postForEntity(
                url("/api/v1/auth/register"),
                Map.of("email", email, "password", "Password123", "role", "SUPER_ADMIN"),
                Map.class);
        assertThat(register.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        Map<String, Object> row = jdbcTemplate.queryForMap("SELECT id FROM users WHERE email = ?", email);
        Integer grantCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM platform_admins WHERE user_id = ?", Integer.class, row.get("id"));
        assertThat(grantCount).isZero();
    }

    @Autowired
    private LocalSuperAdminSeeder seeder;

    private ResponseEntity<Map> authorizedGet(String path, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(url(path), HttpMethod.GET, new HttpEntity<>(headers), Map.class);
    }

    private String latestVerificationCodeFor(String email) {
        String body = jdbcTemplate.queryForObject(
                "SELECT body FROM email_outbox WHERE to_email = ? ORDER BY created_at DESC LIMIT 1",
                String.class, email);
        Matcher matcher = VERIFICATION_CODE_PATTERN.matcher(body);
        if (!matcher.find()) {
            throw new IllegalStateException("No verification code found for " + email);
        }
        return matcher.group(1);
    }
}
