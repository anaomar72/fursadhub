package com.fursadhub.file.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.file.domain.FileClassification;
import com.fursadhub.file.domain.PrivateFileStorage;
import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.file.domain.StoredFileRepository;
import com.fursadhub.file.infrastructure.storage.StorageKeyGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.UUID;

/**
 * Stores and reads private documents (CLAUDE.md sections 47-48).
 *
 * <p>Deliberately NOT an authorization boundary and deliberately NOT exposed over HTTP on its own.
 * There is no {@code /api/v1/files/{id}} route anywhere in Phase 6: a document is always reached
 * through the business resource that owns it, because that resource is the only thing that knows who
 * is allowed to read it. Callers must authorize BEFORE calling {@link #open}.
 */
@Service
public class PrivateFileService {

    private static final Logger log = LoggerFactory.getLogger(PrivateFileService.class);

    /** PDF magic bytes. A file claiming to be a PDF must actually begin like one. */
    private static final byte[] PDF_MAGIC = {0x25, 0x50, 0x44, 0x46}; // %PDF

    private final StoredFileRepository files;
    private final PrivateFileStorage storage;

    public PrivateFileService(StoredFileRepository files, PrivateFileStorage storage) {
        this.files = files;
        this.storage = storage;
    }

    /**
     * Validates and stores an uploaded document, returning its metadata row.
     *
     * <p>Validation is by classification, not by whatever the browser claims it is sending: the
     * declared content type, the size and — for PDFs — the actual leading bytes must all agree with
     * the policy for that classification. A renamed executable therefore fails on content, not only
     * on extension (CLAUDE.md section 48).
     */
    public StoredFile store(MultipartFile upload, FileClassification classification, UUID uploadedBy) {
        requirePresent(upload);
        requireSize(upload, classification);
        String contentType = requirePermittedContentType(upload, classification);
        requireMagicBytes(upload, contentType);

        String storageKey = StorageKeyGenerator.generate(classification);
        try (InputStream content = upload.getInputStream()) {
            storage.put(storageKey, contentType, upload.getSize(), content);
        } catch (IOException e) {
            throw invalidFile("The uploaded document could not be read.");
        }

        StoredFile stored = StoredFile.of(
                storageKey, safeFilename(upload.getOriginalFilename()), contentType,
                upload.getSize(), classification, uploadedBy);
        return files.save(stored);
    }

    public StoredFile metadata(UUID storedFileId) {
        return files.findById(storedFileId)
                .orElseThrow(() -> new ApiException(
                        "FILE_NOT_FOUND", HttpStatus.NOT_FOUND, "The document is no longer available."));
    }

    /**
     * Opens the document for streaming. The caller MUST already have authorized the requester
     * against the resource that owns this file.
     */
    public InputStream open(StoredFile file) {
        return storage.open(file.getStorageKey());
    }

    /**
     * Removes a replaced document. Best-effort on purpose: a storage failure here must not roll back
     * the business transaction that already replaced the pointer, so the worst case is one orphaned
     * object rather than a report the student cannot resubmit.
     */
    public void deleteQuietly(UUID storedFileId) {
        if (storedFileId == null) {
            return;
        }
        try {
            StoredFile file = metadata(storedFileId);
            storage.delete(file.getStorageKey());
            files.deleteById(storedFileId);
        } catch (RuntimeException e) {
            log.warn("Could not remove replaced document {} — leaving it for cleanup", storedFileId, e);
        }
    }

    // ---------------------------------------------------------------- validation

    private void requirePresent(MultipartFile upload) {
        if (upload == null || upload.isEmpty()) {
            throw invalidFile("Choose a document to upload.");
        }
    }

    private void requireSize(MultipartFile upload, FileClassification classification) {
        if (upload.getSize() > classification.maxSizeBytes()) {
            throw new ApiException("FILE_TOO_LARGE", HttpStatus.PAYLOAD_TOO_LARGE,
                    "That document is larger than the maximum allowed size.");
        }
    }

    private String requirePermittedContentType(MultipartFile upload, FileClassification classification) {
        String declared = upload.getContentType();
        if (declared == null) {
            throw invalidFile("The document type could not be determined.");
        }
        // Strip any "; charset=..." parameter before comparing.
        String normalized = declared.split(";")[0].trim().toLowerCase(Locale.ROOT);
        if (!classification.permittedContentTypes().contains(normalized)) {
            throw invalidFile("That document type is not accepted.");
        }
        return normalized;
    }

    /**
     * Content-type headers are supplied by the client and are trivially forged, so a PDF upload must
     * also LOOK like a PDF. This is not a full parse — it is the cheap check that stops the obvious
     * case of an arbitrary file renamed to .pdf.
     */
    private void requireMagicBytes(MultipartFile upload, String contentType) {
        if (!"application/pdf".equals(contentType)) {
            return;
        }
        try (InputStream in = upload.getInputStream()) {
            byte[] header = in.readNBytes(PDF_MAGIC.length);
            if (header.length < PDF_MAGIC.length) {
                throw invalidFile("That document is not a valid PDF.");
            }
            for (int i = 0; i < PDF_MAGIC.length; i++) {
                if (header[i] != PDF_MAGIC[i]) {
                    throw invalidFile("That document is not a valid PDF.");
                }
            }
        } catch (IOException e) {
            throw invalidFile("The uploaded document could not be read.");
        }
    }

    /**
     * Keeps only the base name and strips anything that could be interpreted as a path. The filename
     * is display metadata only — it never participates in the storage key — but it is echoed back in
     * a {@code Content-Disposition} header, so it must not carry separators or control characters.
     */
    private String safeFilename(String original) {
        if (original == null || original.isBlank()) {
            return "document.pdf";
        }
        String base = original.replace('\\', '/');
        base = base.substring(base.lastIndexOf('/') + 1);
        base = base.replaceAll("[\\p{Cntrl}\"\\r\\n]", "").trim();
        if (base.isBlank()) {
            return "document.pdf";
        }
        return base.length() > 200 ? base.substring(0, 200) : base;
    }

    private ApiException invalidFile(String message) {
        return new ApiException("FINAL_REPORT_FILE_INVALID", HttpStatus.BAD_REQUEST, message);
    }
}
