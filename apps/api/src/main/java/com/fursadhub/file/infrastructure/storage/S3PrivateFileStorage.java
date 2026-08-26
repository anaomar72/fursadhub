package com.fursadhub.file.infrastructure.storage;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.file.domain.PrivateFileStorage;
import org.springframework.http.HttpStatus;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

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
        } catch (S3Exception e) {
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
        } catch (S3Exception e) {
            throw storageUnavailable(e);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(storageKey).build());
        } catch (S3Exception e) {
            throw storageUnavailable(e);
        }
    }

    /**
     * Storage failures never leak the endpoint, bucket, key or credentials into the API response.
     * The underlying exception is attached as the cause so it reaches the application log, where
     * operators can see it and end users cannot (CLAUDE.md section 68).
     */
    private ApiException storageUnavailable(S3Exception cause) {
        ApiException exception = new ApiException(
                "FILE_STORAGE_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE,
                "Document storage is temporarily unavailable. Please try again.");
        exception.initCause(cause);
        return exception;
    }
}
