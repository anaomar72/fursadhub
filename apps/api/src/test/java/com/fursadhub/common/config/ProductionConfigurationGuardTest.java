package com.fursadhub.common.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The guard's whole value is that it refuses, so every case here asserts on a refusal or on the
 * absence of one.
 *
 * <p>Two layers are covered: the pure rule function {@code collectProblems}, and the
 * {@code EnvironmentPostProcessor} adapter. The latter matters because the ordering guarantee —
 * refuse before Flyway opens the datasource — lives entirely in being a post-processor rather than
 * a bean, and a live production-profile boot proved that ordering is not theoretical.
 */
class ProductionConfigurationGuardTest {

    private static final String REAL_KEY = "classpath:keys/app.pem";
    private static final String REAL_SECRET = "a-real-hmac-secret";
    private static final String REAL_APP_URL = "https://app.fursadhub.so";
    private static final String REAL_MAIL_HOST = "smtp.provider.example";
    private static final String REAL_ENDPOINT = "https://s3.eu-central-1.amazonaws.com";

    private static List<String> problems(
            String privateKey, String publicKey, String codeSecret, String appBaseUrl, String mailHost,
            String provider, String endpoint, String accessKey, String secretKey, String bucket) {
        return ProductionConfigurationGuard.collectProblems(new ProductionConfigurationGuard.Settings(
                privateKey, publicKey, codeSecret, appBaseUrl, mailHost,
                provider, endpoint, accessKey, secretKey, bucket));
    }

    /** Everything correct except the one thing each test is about. */
    private static List<String> withAppUrl(String appBaseUrl) {
        return problems(REAL_KEY, REAL_KEY, REAL_SECRET, appBaseUrl, REAL_MAIL_HOST,
                "s3", REAL_ENDPOINT, "AKIAREALKEY", "a-real-storage-secret", "prod-documents");
    }

    private static List<String> withStorage(String provider, String endpoint, String accessKey,
            String secretKey, String bucket) {
        return problems(REAL_KEY, REAL_KEY, REAL_SECRET, REAL_APP_URL, REAL_MAIL_HOST,
                provider, endpoint, accessKey, secretKey, bucket);
    }

    @Test
    @DisplayName("A correctly configured deployment starts")
    void aFullyConfiguredDeploymentStarts() {
        assertThat(withAppUrl(REAL_APP_URL)).isEmpty();
    }

    @Nested
    @DisplayName("Signing material")
    class SigningMaterial {

        @Test
        @DisplayName("Missing JWT keys are refused, because ephemeral keys break auth across restarts")
        void missingJwtKeysAreRefused() {
            assertThat(problems("", "", REAL_SECRET, REAL_APP_URL, REAL_MAIL_HOST,
                    "s3", REAL_ENDPOINT, "k", "s", "bucket"))
                    .anyMatch(p -> p.contains("JWT_PRIVATE_KEY"));
        }

        /** Half-configured is still ephemeral: JwtKeyConfig requires BOTH before it parses either. */
        @Test
        @DisplayName("Half-configured JWT keys are refused too")
        void halfConfiguredJwtKeysAreRefused() {
            assertThat(problems(REAL_KEY, "", REAL_SECRET, REAL_APP_URL, REAL_MAIL_HOST,
                    "s3", REAL_ENDPOINT, "k", "s", "bucket"))
                    .anyMatch(p -> p.contains("JWT_PRIVATE_KEY"));
        }

        @Test
        @DisplayName("A missing email-verification HMAC secret is refused")
        void missingCodeSecretIsRefused() {
            assertThat(problems(REAL_KEY, REAL_KEY, "  ", REAL_APP_URL, REAL_MAIL_HOST,
                    "s3", REAL_ENDPOINT, "k", "s", "bucket"))
                    .anyMatch(p -> p.contains("EMAIL_VERIFICATION_CODE_SECRET"));
        }
    }

    @Nested
    @DisplayName("Outbound links and mail")
    class OutboundLinks {

        @Test
        @DisplayName("A localhost APP_BASE_URL is refused — recipients cannot open it")
        void localhostAppBaseUrlIsRefused() {
            assertThat(withAppUrl("http://localhost:5173")).anyMatch(p -> p.contains("APP_BASE_URL"));
        }

        @Test
        @DisplayName("A localhost SMTP host is refused — MailDev would swallow all mail")
        void localhostMailHostIsRefused() {
            assertThat(problems(REAL_KEY, REAL_KEY, REAL_SECRET, REAL_APP_URL, "localhost",
                    "s3", REAL_ENDPOINT, "k", "s", "bucket"))
                    .anyMatch(p -> p.contains("SMTP_HOST"));
        }

        @Test
        @DisplayName("Loopback is recognised however it is written")
        void loopbackIsRecognisedInEveryForm() {
            for (String loopback : new String[] {
                    "http://127.0.0.1:5173", "https://localhost", "127.0.0.1",
                    "http://app.fursadhub.local", "0.0.0.0"}) {
                assertThat(withAppUrl(loopback))
                        .as("APP_BASE_URL=%s must be refused", loopback)
                        .anyMatch(p -> p.contains("APP_BASE_URL"));
            }
        }

        /** A real public host must not trip the loopback check. */
        @Test
        @DisplayName("A real host containing the word 'local' is not mistaken for loopback")
        void realHostsAreNotMistakenForLoopback() {
            assertThat(withAppUrl("https://local-jobs.fursadhub.so")).isEmpty();
        }
    }

    @Nested
    @DisplayName("Private document storage")
    class Storage {

        @Test
        @DisplayName("The committed local MinIO credentials are refused")
        void committedDevCredentialsAreRefused() {
            assertThat(withStorage("s3", REAL_ENDPOINT, "fursadhub", "fursadhub-local-secret", "bucket"))
                    .anyMatch(p -> p.contains("STORAGE_ACCESS_KEY"));
        }

        @Test
        @DisplayName("A localhost storage endpoint is refused")
        void localhostEndpointIsRefused() {
            assertThat(withStorage("s3", "http://localhost:9000", "k", "s", "bucket"))
                    .anyMatch(p -> p.contains("STORAGE_ENDPOINT"));
        }

        @Test
        @DisplayName("The local development bucket is refused")
        void devBucketIsRefused() {
            assertThat(withStorage("s3", REAL_ENDPOINT, "k", "s", "fursadhub-local"))
                    .anyMatch(p -> p.contains("STORAGE_BUCKET"));
        }

        /**
         * A blank endpoint means "use the provider's own endpoint", which is how a real AWS S3
         * deployment is configured. It must not be mistaken for the local MinIO fallback.
         */
        @Test
        @DisplayName("A blank endpoint is allowed — that is how real AWS S3 is configured")
        void blankEndpointIsAllowed() {
            assertThat(withStorage("s3", "", "k", "s", "bucket")).isEmpty();
        }

        /**
         * StorageConfig already refuses the filesystem provider on these profiles, so the storage
         * checks here would be duplicated noise for a deployment that will not start anyway.
         */
        @Test
        @DisplayName("Storage checks are skipped for the filesystem provider, which StorageConfig refuses")
        void filesystemProviderIsLeftToStorageConfig() {
            assertThat(withStorage("filesystem", "http://localhost:9000", "fursadhub",
                    "fursadhub-local-secret", "fursadhub-local")).isEmpty();
        }
    }

    /**
     * One restart should reveal the whole list. Discovering the next missing variable after each
     * redeploy is how a fifteen-minute configuration task becomes an afternoon.
     */
    @Test
    @DisplayName("Every problem is reported at once, not one per restart")
    void everyProblemIsReportedTogether() {
        String all = String.join("\n", problems("", "", "", "http://localhost:5173", "localhost",
                "s3", "http://localhost:9000", "fursadhub", "fursadhub-local-secret", "fursadhub-local"));

        assertThat(all)
                .contains("JWT_PRIVATE_KEY")
                .contains("EMAIL_VERIFICATION_CODE_SECRET")
                .contains("APP_BASE_URL")
                .contains("SMTP_HOST")
                .contains("STORAGE_ENDPOINT")
                .contains("STORAGE_ACCESS_KEY")
                .contains("STORAGE_BUCKET");
    }

    @Nested
    @DisplayName("Profile scoping and ordering")
    class ProfileScoping {

        private final ProductionConfigurationGuard guard = new ProductionConfigurationGuard();

        private MockEnvironment environmentWithDevDefaults(String... profiles) {
            MockEnvironment environment = new MockEnvironment();
            environment.setActiveProfiles(profiles);
            environment.setProperty("fursadhub.notification.app-base-url", "http://localhost:5173");
            environment.setProperty("spring.mail.host", "localhost");
            environment.setProperty("fursadhub.storage.bucket", "fursadhub-local");
            return environment;
        }

        @Test
        @DisplayName("Local, test and CI profiles are untouched — they run unconfigured on purpose")
        void permissiveProfilesAreUntouched() {
            for (String profile : new String[] {"local", "test", "ci"}) {
                assertThatCode(() -> guard.postProcessEnvironment(environmentWithDevDefaults(profile), null))
                        .as("profile %s must not be guarded", profile)
                        .doesNotThrowAnyException();
            }
        }

        @Test
        @DisplayName("No active profile at all is untouched")
        void noProfileIsUntouched() {
            assertThatCode(() -> guard.postProcessEnvironment(environmentWithDevDefaults(), null))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Staging and production are refused, naming environment variables")
        void deployedProfilesAreRefused() {
            for (String profile : new String[] {"staging", "production"}) {
                assertThatThrownBy(() -> guard.postProcessEnvironment(environmentWithDevDefaults(profile), null))
                        .as("profile %s must be guarded", profile)
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("JWT_PRIVATE_KEY")
                        .hasMessageContaining("APP_BASE_URL")
                        .hasMessageNotContaining("fursadhub.jwt.private-key-location");
            }
        }

        /**
         * The ordering guarantee. A live production-profile boot showed that as an
         * {@code InitializingBean} this ran AFTER Flyway: a misconfigured deployment migrated the
         * schema and only then refused, and when the database was also unreachable a datasource
         * stack trace buried the real message entirely. Being an {@code EnvironmentPostProcessor}
         * is what puts the refusal first, so it is pinned here rather than left to convention.
         */
        @Test
        @DisplayName("It is an EnvironmentPostProcessor, so it runs before Flyway and the datasource")
        void itRunsBeforeAnyBean() {
            assertThat(org.springframework.boot.env.EnvironmentPostProcessor.class)
                    .isAssignableFrom(ProductionConfigurationGuard.class);
        }
    }
}
