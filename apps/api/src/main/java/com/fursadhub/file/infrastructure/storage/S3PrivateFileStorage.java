package com.fursadhub.file.infrastructure.storage;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.file.domain.PrivateFileStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.InputStream;

/**
 * The production {@link PrivateFileStorage}: a private S3-compatible bucket (CLAUDE.md section 47,
 * ADR-004). Works against AWS S3 and against MinIO, which is what {@code infra/compose.yaml} runs
 * locally.
 *
 * <p>Objects are written with no ACL and no public-read grant, and this class exposes no way to
 * obtain a URL for one — not even a pre-signed one. Every read goes through {@link #open}, which
 * streams the bytes back through the API only after the owning business resource has authorized the
 * caller.
 */
public class S3PrivateFileStorage implements PrivateFileStorage {

    private static final Logger log = LoggerFactory.getLogger(S3PrivateFileStorage.class);

    private final S3Client client;
    private final String bucket;

    public S3PrivateFileStorage(S3Client client, String bucket) {
        this.client = client;
        this.bucket = bucket;
    }

    @Override
    public void put(String storageKey, String contentType, long sizeBytes, InputStream content) {
        try {
            client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(storageKey)
                            .contentType(contentType)
                            .build(),
                    RequestBody.fromInputStream(content, sizeBytes));
        } catch (SdkException e) {
            throw storageUnavailable(e);
        }
    }

    @Override
    public InputStream open(String storageKey) {
        try {
            return client.getObject(GetObjectRequest.builder().bucket(bucket).key(storageKey).build());
        } catch (NoSuchKeyException e) {
            // The metadata row exists but the object does not. Reported as a 404 for the document
            // rather than a 500, and deliberately without echoing the storage key.
            throw new ApiException("FILE_NOT_FOUND", HttpStatus.NOT_FOUND, "The document is no longer available.");
        } catch (SdkException e) {
            throw storageUnavailable(e);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(storageKey).build());
        } catch (SdkException e) {
            throw storageUnavailable(e);
        }
    }

    /**
     * Storage failures never leak the endpoint, bucket, key or credentials into the API response.
     * Logged here explicitly, rather than relying on {@code GlobalExceptionHandler} to do it: that
     * handler only logs exceptions it did not recognize, and {@link ApiException} is always one it
     * recognizes, so a storage failure reported this way previously reached no log at all — the
     * operators CLAUDE.md section 68 means to leave this visible to never actually saw it.
     *
     * <p>Catches {@link SdkException} rather than only its {@code S3Exception} subtype: a failure
     * that never reaches S3 at all — a client-side unmarshalling error, a network drop — is an
     * {@code SdkClientException}, a sibling class, and previously fell through uncaught to a bare
     * 500 instead of this deliberate {@code FILE_STORAGE_UNAVAILABLE} response.
     */
    private ApiException storageUnavailable(SdkException cause) {
        log.error("Private file storage call failed", cause);
        ApiException exception = new ApiException(
                "FILE_STORAGE_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE,
                "Document storage is temporarily unavailable. Please try again.");
        exception.initCause(cause);
        return exception;
    }
}
