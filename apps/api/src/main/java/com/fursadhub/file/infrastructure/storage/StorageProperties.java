package com.fursadhub.file.infrastructure.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Private object-storage configuration (CLAUDE.md section 47/64).
 *
 * <p>Credentials arrive from the environment and are never committed. The bucket is private: no
 * public-read policy, no website hosting, and FursadHub issues no pre-signed URLs for it.
 */
@ConfigurationProperties(prefix = "fursadhub.storage")
public class StorageProperties {

    /**
     * Which {@code PrivateFileStorage} implementation is active. {@code s3} is the real one and the
     * only one permitted in staging/production; {@code filesystem} exists so local development and
     * the integration suite do not need a MinIO container running to exercise report upload and the
     * authorization around it.
     */
    private Provider provider = Provider.S3;

    private String endpoint = "";
    private String region = "us-east-1";
    private String bucket = "";
    private String accessKey = "";
    private String secretKey = "";

    /** Root directory used by the {@code filesystem} provider only. */
    private String filesystemDirectory = "";

    public enum Provider {
        S3,
        FILESYSTEM
    }

    public Provider getProvider() {
        return provider;
    }

    public void setProvider(Provider provider) {
        this.provider = provider;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getBucket() {
        return bucket;
    }

    public void setBucket(String bucket) {
        this.bucket = bucket;
    }

    public String getAccessKey() {
        return accessKey;
    }

    public void setAccessKey(String accessKey) {
        this.accessKey = accessKey;
    }

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public String getFilesystemDirectory() {
        return filesystemDirectory;
    }

    public void setFilesystemDirectory(String filesystemDirectory) {
        this.filesystemDirectory = filesystemDirectory;
    }
}
