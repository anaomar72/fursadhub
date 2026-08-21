package com.fursadhub.identity;

import com.fursadhub.common.notification.EmailOutboxMessage;
import com.fursadhub.common.notification.EmailOutboxRepository;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.infrastructure.OpaqueTokenGenerator;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Shared Testcontainers PostgreSQL base for Phase 1 authentication integration tests (CLAUDE.md
 * section 59 — no H2 as the primary integration-test database). Uses the "singleton container"
 * pattern (manual static start, no {@code @Testcontainers}/{@code @Container} lifecycle
 * management) deliberately: those annotations stop the container in each test class's own
 * {@code @AfterAll}, and since this container is a static field inherited by every identity IT
 * subclass, the JUnit5 Testcontainers extension would tear it down after the first subclass's
 * tests finished and break every subclass that runs after it. Testcontainers' Ryuk reaper cleans
 * this container up when the JVM exits.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class AbstractIdentityIT {

    static final PostgreSQLContainer<?> POSTGRES;

    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("fursadhub_test")
                .withUsername("fursadhub_test")
                .withPassword("fursadhub_test");
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @LocalServerPort
    protected int port;

    /**
     * Deliberately NOT the {@code @Autowired TestRestTemplate} bean: Spring Boot's default
     * TestRestTemplate client (Apache HttpClient, when present on the classpath) manages an
     * internal cookie store, which silently merges/overrides the {@code Cookie} header these
     * tests set by hand to simulate a specific stored refresh token — causing e.g. a replay test
     * to accidentally send the freshly-rotated cookie instead of the stale one it means to reuse.
     * This client uses the plain JDK request factory (no cookie jar) plus TestRestTemplate's
     * lenient "don't throw on 4xx/5xx" error handling, so tests fully control every cookie sent.
     */
    protected final RestTemplate restTemplate = buildStatelessRestTemplate();

    private static RestTemplate buildStatelessRestTemplate() {
        // java.net.http.HttpClient-based factory — no cookie jar (unlike Apache HttpClient) and,
        // unlike the legacy SimpleClientHttpRequestFactory (HttpURLConnection), reliably exposes
        // the response body on non-2xx responses.
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

    @Autowired
    protected EmailOutboxRepository emailOutboxRepository;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected OpaqueTokenGenerator tokenGenerator;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    private static final Pattern TOKEN_PATTERN = Pattern.compile("token=([^\\s]+)");

    protected String url(String path) {
        return "http://localhost:" + port + path;
    }

    protected String uniqueEmail(String prefix) {
        return prefix + "-" + java.util.UUID.randomUUID() + "@example.test";
    }

    /** Reads the raw token out of the most recent outbox email body — simulates "opening the email". */
    protected String latestTokenFor(String toEmail) {
        List<EmailOutboxMessage> messages = emailOutboxRepository.findByToEmailOrderByCreatedAtDesc(toEmail);
        assertFalseEmpty(messages, toEmail);
        Matcher matcher = TOKEN_PATTERN.matcher(messages.get(0).getBody());
        if (!matcher.find()) {
            throw new IllegalStateException("No token found in outbox body for " + toEmail);
        }
        return matcher.group(1);
    }

    private void assertFalseEmpty(List<EmailOutboxMessage> messages, String toEmail) {
        if (messages.isEmpty()) {
            throw new IllegalStateException("No outbox message found for " + toEmail);
        }
    }

    protected void expireEmailVerificationToken(String rawToken) {
        jdbcTemplate.update(
                "UPDATE email_verification_tokens SET expires_at = now() - interval '1 second' WHERE token_hash = ?",
                tokenGenerator.hash(rawToken));
    }

    protected void expirePasswordResetToken(String rawToken) {
        jdbcTemplate.update(
                "UPDATE password_reset_tokens SET expires_at = now() - interval '1 second' WHERE token_hash = ?",
                tokenGenerator.hash(rawToken));
    }

    protected void expireRefreshTokenCookie(String rawToken) {
        jdbcTemplate.update(
                "UPDATE refresh_tokens SET expires_at = now() - interval '1 second' WHERE token_hash = ?",
                tokenGenerator.hash(rawToken));
    }

    protected void suspendUser(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        user.suspend();
        userRepository.save(user);
    }

    protected void register(String email, String password) {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/register"), Map.of("email", email, "password", password), Map.class);
        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Registration failed with status " + response.getStatusCode());
        }
    }

    /** @return the raw access token from a successful login. */
    protected String loginAndExtractAccessToken(String email, String password) {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/login"), Map.of("email", email, "password", password), Map.class);
        return (String) response.getBody().get("accessToken");
    }

    protected ResponseEntity<Map> login(String email, String password) {
        return restTemplate.postForEntity(url("/api/v1/auth/login"), Map.of("email", email, "password", password), Map.class);
    }

    protected String loginAndExtractRawRefreshToken(String email, String password) {
        ResponseEntity<Map> response = login(email, password);
        return extractRawRefreshTokenFromSetCookie(response.getHeaders().get(HttpHeaders.SET_COOKIE));
    }

    protected String extractRawRefreshTokenFromSetCookie(List<String> setCookieHeaders) {
        return setCookieHeaders.stream()
                .filter(h -> h.startsWith("fh_refresh_token="))
                .findFirst()
                .map(h -> h.split(";", 2)[0].substring("fh_refresh_token=".length()))
                .orElseThrow(() -> new IllegalStateException("No refresh cookie in response"));
    }

    protected ResponseEntity<Map> refreshWith(String rawRefreshToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, "fh_refresh_token=" + rawRefreshToken);
        return restTemplate.exchange(url("/api/v1/auth/refresh"), HttpMethod.POST, new HttpEntity<>(headers), Map.class);
    }

    protected ResponseEntity<Map> logoutWith(String rawRefreshToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, "fh_refresh_token=" + rawRefreshToken);
        return restTemplate.exchange(url("/api/v1/auth/logout"), HttpMethod.POST, new HttpEntity<>(headers), Map.class);
    }

    protected ResponseEntity<Map> logoutAllWith(String accessToken, String rawRefreshToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, "fh_refresh_token=" + rawRefreshToken);
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(url("/api/v1/auth/logout-all"), HttpMethod.POST, new HttpEntity<>(headers), Map.class);
    }

    protected ResponseEntity<Map> getMe(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(url("/api/v1/me"), HttpMethod.GET, new HttpEntity<>(headers), Map.class);
    }
}
