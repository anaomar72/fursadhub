package com.fursadhub.file.infrastructure.storage;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.file.domain.PrivateFileStorage;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * A local-disk {@link PrivateFileStorage} for development and the integration suite ONLY.
 *
 * <p>It exists so that report upload, download authorization and the audit trail around them can be
 * exercised without running a MinIO container, not as an alternative architecture. Staging and
 * production are refused this provider outright by {@code StorageConfig}, because a directory on an
 * application host is not private object storage and does not survive the host
 * (CLAUDE.md section 47, ADR-004).
 *
 * <p>Even here the guarantees that matter are preserved: the key is random, nothing is served
 * statically, and no path is ever exposed to a browser.
 */
public class FilesystemPrivateFileStorage implements PrivateFileStorage {

    private final Path root;

    public FilesystemPrivateFileStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create the local document storage directory", e);
        }
    }

    @Override
    public void put(String storageKey, String contentType, long sizeBytes, InputStream content) {
        Path target = resolve(storageKey);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw unavailable(e);
        }
    }

    @Override
    public InputStream open(String storageKey) {
        try {
            return Files.newInputStream(resolve(storageKey));
        } catch (NoSuchFileException e) {
            throw new ApiException("FILE_NOT_FOUND", HttpStatus.NOT_FOUND, "The document is no longer available.");
        } catch (IOException e) {
            throw unavailable(e);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            Files.deleteIfExists(resolve(storageKey));
        } catch (IOException e) {
            throw unavailable(e);
        }
    }

    /**
     * Resolves a key under the storage root and refuses anything that escapes it. Keys are generated
     * by {@link StorageKeyGenerator} and cannot contain traversal sequences today, but a storage
     * backend that trusts its input to stay inside its own directory is one refactor away from an
     * arbitrary-file-read bug.
     */
    private Path resolve(String storageKey) {
        Path resolved = root.resolve(storageKey).normalize();
        if (!resolved.startsWith(root)) {
            throw new ApiException("FILE_NOT_FOUND", HttpStatus.NOT_FOUND, "The document is no longer available.");
        }
        return resolved;
    }

    private ApiException unavailable(IOException cause) {
        ApiException exception = new ApiException(
                "FILE_STORAGE_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE,
                "Document storage is temporarily unavailable. Please try again.");
        exception.initCause(cause);
        return exception;
    }
}
