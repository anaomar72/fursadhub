package com.fursadhub.file.infrastructure.storage;

import com.fursadhub.file.domain.PrivateFileStorage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;

/**
 * Wires the single {@link PrivateFileStorage} bean (CLAUDE.md section 47, ADR-004).
 *
 * <p>The S3 provider is the default and the only one accepted in staging or production. Selecting
 * the local filesystem provider there fails startup rather than degrading quietly — a misconfigured
 * deployment that writes student reports to a container's ephemeral disk is exactly the failure that
 * must be loud.
 */
@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class StorageConfig {

    private static final Set<String> PROTECTED_PROFILES = Set.of("staging", "production");

    @Bean
    @ConditionalOnMissingBean(PrivateFileStorage.class)
    public PrivateFileStorage privateFileStorage(StorageProperties properties, Environment environment) {
        if (properties.getProvider() == StorageProperties.Provider.FILESYSTEM) {
            requireNotProtectedProfile(environment);
            return new FilesystemPrivateFileStorage(Path.of(resolveLocalDirectory(properties)));
        }
        return new S3PrivateFileStorage(buildS3Client(properties), requireBucket(properties));
    }

    private S3Client buildS3Client(StorageProperties properties) {
        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(properties.getRegion()))
                .httpClient(UrlConnectionHttpClient.builder().build())
                // Since SDK 2.25 the default (WHEN_SUPPORTED) attaches a trailing CRC32 checksum to
                // every PutObject via chunked transfer-encoding. UrlConnectionHttpClient — chosen
                // above to avoid pulling in Netty/Apache for a handful of small sync calls — cannot
                // unmarshal MinIO's response to that trailer format, which surfaces as an uncaught
                // SdkClientException (not S3Exception) on every upload. WHEN_REQUIRED skips the
                // trailer unless an operation specifically demands a checksum, which none here do.
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                // MinIO and most self-hosted S3-compatible servers do not implement virtual-host
                // style addressing, so keys are addressed as <endpoint>/<bucket>/<key>.
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());

        if (!properties.getEndpoint().isBlank()) {
            builder.endpointOverride(URI.create(properties.getEndpoint()));
        }
        if (!properties.getAccessKey().isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey())));
        }
        return builder.build();
    }

    private String requireBucket(StorageProperties properties) {
        if (properties.getBucket().isBlank()) {
            throw new IllegalStateException(
                    "STORAGE_BUCKET must be configured — FursadHub stores private documents in "
                            + "S3-compatible object storage, never in PostgreSQL or on the application host.");
        }
        return properties.getBucket();
    }

    private String resolveLocalDirectory(StorageProperties properties) {
        if (!properties.getFilesystemDirectory().isBlank()) {
            return properties.getFilesystemDirectory();
        }
        return System.getProperty("java.io.tmpdir") + "/fursadhub-local-documents";
    }

    private void requireNotProtectedProfile(Environment environment) {
        List<String> active = List.of(environment.getActiveProfiles());
        if (active.stream().anyMatch(PROTECTED_PROFILES::contains)) {
            throw new IllegalStateException(
                    "fursadhub.storage.provider=filesystem is not permitted in staging or production. "
                            + "Private documents must live in S3-compatible object storage (ADR-004).");
        }
    }
}
