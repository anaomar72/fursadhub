package com.fursadhub.common.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Refuses to start a staging or production deployment that is still carrying local-development
 * defaults (CLAUDE.md sections 63, 64, 68).
 *
 * <p><strong>Why this exists.</strong> Every setting below already had a sensible local default so
 * that {@code docker compose up} plus {@code mvnw spring-boot:run} works with no configuration at
 * all — which is exactly right for local work, and exactly wrong when the same jar is deployed.
 * {@code apps/api/Dockerfile} sets {@code SPRING_PROFILES_ACTIVE=production}, so the shipped image
 * run without configuration hit every one of these paths. A deployment that forgot
 * {@code JWT_PRIVATE_KEY} did not fail: it generated an ephemeral in-memory keypair, logged one
 * warning, and came up "healthy". Every restart then silently invalidated every access token in
 * circulation, and behind more than one replica a token minted by one instance was rejected by the
 * next. The same shape applied to the email-verification HMAC, to object storage (which fell back
 * to {@code localhost:9000} with the credentials committed in this repository), and to the base URL
 * printed into verification and password-reset emails.
 *
 * <p>{@code .env.example} already warns about each of these in prose. Prose is not a control: it is
 * read once, by whoever writes the first deployment, and never again. This turns each warning into
 * a startup failure that names the missing variable.
 *
 * <p><strong>Why an {@link EnvironmentPostProcessor} rather than a bean.</strong> This must run
 * before anything else, and "anything else" includes Flyway. As an {@code InitializingBean} it ran
 * after the migration initializer, so a misconfigured deployment migrated the production schema and
 * only then refused to start — which is harmless but reads like a half-finished deploy, and buried
 * the real message under a datasource stack trace when the database was also unreachable. An
 * environment post-processor runs before the application context exists at all, so the refusal is
 * the first thing the operator sees.
 *
 * <p><strong>Fail fast, and fail completely.</strong> All problems are collected and reported in one
 * exception rather than one per restart, so an operator fixes the whole environment in a single
 * pass instead of discovering the next missing variable after each redeploy.
 *
 * <p>Scoped to the deployed profiles exactly as {@link com.fursadhub.file.infrastructure.storage.StorageConfig}
 * scopes its filesystem-provider refusal: under {@code local}, {@code test} or CI this returns
 * immediately, so local development and the integration suite keep working with no configuration
 * and their behaviour is unchanged.
 *
 * <p>Registered in {@code META-INF/spring.factories}.
 */
public class ProductionConfigurationGuard implements EnvironmentPostProcessor {

    private static final Set<String> PROTECTED_PROFILES = Set.of("staging", "production");

    /**
     * Values shipped in this repository for local MinIO. Deploying with these still set means the
     * deployment is pointing at a developer's laptop conventions, not at real storage.
     */
    private static final String DEV_STORAGE_ACCESS_KEY = "fursadhub";
    private static final String DEV_STORAGE_SECRET_KEY = "fursadhub-local-secret";
    private static final String DEV_STORAGE_BUCKET = "fursadhub-local";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (!isProtectedProfile(environment)) {
            return;
        }
        List<String> problems = collectProblems(new Settings(environment));
        if (!problems.isEmpty()) {
            throw new IllegalStateException(buildMessage(problems));
        }
    }

    /**
     * Package-private so the test can exercise the rules without standing up an environment. The
     * post-processor above is a two-line adapter over this.
     */
    static List<String> collectProblems(Settings settings) {
        List<String> problems = new ArrayList<>();

        // --- Signing material. Ephemeral keys break authentication across restarts and replicas. ---
        if (isBlank(settings.jwtPrivateKey()) || isBlank(settings.jwtPublicKey())) {
            problems.add("JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must both be configured. Without them the "
                    + "API generates an ephemeral in-memory RSA keypair, so every restart invalidates "
                    + "every access token and a second replica rejects the first replica's tokens.");
        }
        if (isBlank(settings.emailVerificationCodeSecret())) {
            problems.add("EMAIL_VERIFICATION_CODE_SECRET must be configured. Without it the HMAC key "
                    + "used to hash email-verification codes at rest is generated per process, so a "
                    + "code issued before a restart can never be verified after it.");
        }

        // --- Outbound links and mail. A localhost link in a real email is a dead end for the user. ---
        if (isBlank(settings.appBaseUrl()) || isLoopback(settings.appBaseUrl())) {
            problems.add("APP_BASE_URL must point at the deployed frontend. It is the base of the "
                    + "links in verification and password-reset emails, and still resolves to "
                    + "localhost, which no recipient can open.");
        }
        if (isBlank(settings.mailHost()) || isLoopback(settings.mailHost())) {
            problems.add("SMTP_HOST must point at a real mail provider. It still resolves to "
                    + "localhost, the MailDev convention from infra/compose.yaml, so no transactional "
                    + "email would leave the host.");
        }

        // --- Private document storage. Only checked for the S3 provider; StorageConfig already
        //     refuses the filesystem provider outright on these profiles. ---
        if (!"filesystem".equalsIgnoreCase(settings.storageProvider())) {
            if (isLoopback(settings.storageEndpoint())) {
                problems.add("STORAGE_ENDPOINT must point at real S3-compatible storage. It still "
                        + "resolves to localhost, the local MinIO convention from infra/compose.yaml.");
            }
            if (DEV_STORAGE_ACCESS_KEY.equals(settings.storageAccessKey())
                    || DEV_STORAGE_SECRET_KEY.equals(settings.storageSecretKey())) {
                problems.add("STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY are still the local MinIO "
                        + "credentials committed in this repository. Configure real storage credentials.");
            }
            if (DEV_STORAGE_BUCKET.equals(settings.storageBucket())) {
                problems.add("STORAGE_BUCKET is still the local development bucket '"
                        + DEV_STORAGE_BUCKET + "'. Configure the deployment's own private bucket.");
            }
        }
        return problems;
    }

    /** The settings this guard reads, so the rules can be tested without an ApplicationContext. */
    record Settings(
            String jwtPrivateKey, String jwtPublicKey, String emailVerificationCodeSecret,
            String appBaseUrl, String mailHost, String storageProvider, String storageEndpoint,
            String storageAccessKey, String storageSecretKey, String storageBucket) {

        Settings(ConfigurableEnvironment environment) {
            this(
                    environment.getProperty("fursadhub.jwt.private-key-location", ""),
                    environment.getProperty("fursadhub.jwt.public-key-location", ""),
                    environment.getProperty("fursadhub.auth.email-verification-code-secret", ""),
                    environment.getProperty("fursadhub.notification.app-base-url", ""),
                    environment.getProperty("spring.mail.host", ""),
                    environment.getProperty("fursadhub.storage.provider", "s3"),
                    environment.getProperty("fursadhub.storage.endpoint", ""),
                    environment.getProperty("fursadhub.storage.access-key", ""),
                    environment.getProperty("fursadhub.storage.secret-key", ""),
                    environment.getProperty("fursadhub.storage.bucket", ""));
        }
    }

    private static boolean isProtectedProfile(ConfigurableEnvironment environment) {
        for (String profile : environment.getActiveProfiles()) {
            if (PROTECTED_PROFILES.contains(profile)) {
                return true;
            }
        }
        return false;
    }

    /**
     * One message listing everything that is wrong. Deliberately names the environment variable
     * rather than the Spring property, because the variable is what the operator actually sets.
     */
    private static String buildMessage(List<String> problems) {
        StringBuilder message = new StringBuilder(
                "Refusing to start: this deployment is still using local-development configuration. "
                        + "See .env.example and docs/architecture/DEPLOYMENT.md.\n");
        for (int i = 0; i < problems.size(); i++) {
            message.append("  ").append(i + 1).append(". ").append(problems.get(i)).append('\n');
        }
        return message.toString();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /**
     * True when the value names the local machine, whether it arrived as a bare host ({@code
     * SMTP_HOST}) or as a URL ({@code APP_BASE_URL}, {@code STORAGE_ENDPOINT}). A blank endpoint is
     * NOT loopback — the S3 client treats blank as "use the provider's real endpoint", which is a
     * legitimate configuration for AWS itself.
     */
    private static boolean isLoopback(String value) {
        if (isBlank(value)) {
            return false;
        }
        String host = value.toLowerCase(Locale.ROOT).trim();
        int scheme = host.indexOf("://");
        if (scheme >= 0) {
            host = host.substring(scheme + 3);
        }
        int slash = host.indexOf('/');
        if (slash >= 0) {
            host = host.substring(0, slash);
        }
        int colon = host.indexOf(':');
        if (colon >= 0) {
            host = host.substring(0, colon);
        }
        return host.equals("localhost") || host.equals("127.0.0.1") || host.equals("::1")
                || host.equals("0.0.0.0") || host.endsWith(".local");
    }
}
