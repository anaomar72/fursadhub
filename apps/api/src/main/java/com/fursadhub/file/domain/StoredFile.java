package com.fursadhub.file.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Metadata for one privately stored document (CLAUDE.md section 47).
 *
 * <p>The document BYTES are never here. PostgreSQL holds only this row; the object itself lives in
 * private S3-compatible storage under {@link #storageKey}, which is random, never guessable from the
 * file id, and never rendered into any URL a browser sees.
 *
 * <p>Immutable after insert. Replacing a document means writing a new object and a new row, so the
 * metadata for a file that some other record still points at can never be silently rewritten.
 */
@Entity
@Table(name = "stored_files")
public class StoredFile {

    @Id
    private UUID id;

    @Column(name = "storage_key", nullable = false, length = 255)
    private String storageKey;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 120)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private FileClassification classification;

    @Column(name = "uploaded_by", nullable = false)
    private UUID uploadedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected StoredFile() {
    }

    public static StoredFile of(
            String storageKey, String originalFilename, String contentType, long sizeBytes,
            FileClassification classification, UUID uploadedBy) {
        StoredFile file = new StoredFile();
        file.id = UUID.randomUUID();
        file.storageKey = storageKey;
        file.originalFilename = originalFilename;
        file.contentType = contentType;
        file.sizeBytes = sizeBytes;
        file.classification = classification;
        file.uploadedBy = uploadedBy;
        file.createdAt = Instant.now();
        return file;
    }

    public UUID getId() {
        return id;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public FileClassification getClassification() {
        return classification;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
