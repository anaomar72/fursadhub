package com.fursadhub.file.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
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
import java.util.Map;
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

    /**
     * Leading bytes each permitted format must actually begin with.
     *
     * <p>Content-type headers come from the client and are trivially forged, so a file claiming to be
     * a PDF must also LOOK like one. This is not a full parse — it is the cheap check that stops the
     * obvious case of an arbitrary file renamed and re-labelled.
     */
    private static final Map<String, byte[]> MAGIC_BYTES = Map.of(
            "application/pdf", new byte[] {0x25, 0x50, 0x44, 0x46},                      // %PDF
            "image/jpeg", new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF},            // JPEG SOI
            "image/png", new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A});

    private final StoredFileRepository files;
    private final PrivateFileStorage storage;
    private final AuditService audit;

    public PrivateFileService(StoredFileRepository files, PrivateFileStorage storage, AuditService audit) {
        this.files = files;
        this.storage = storage;
        this.audit = audit;
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
        requirePresent(upload, classification);
        requireSize(upload, classification);
        String contentType = requirePermittedContentType(upload, classification);
        requireMagicBytes(upload, classification, contentType);

        String storageKey = StorageKeyGenerator.generate(classification);
        try (InputStream content = upload.getInputStream()) {
            storage.put(storageKey, contentType, upload.getSize(), content);
        } catch (IOException e) {
            throw invalidFile(classification, "The uploaded document could not be read.");
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
     * Opens the document AND records that someone read it (CLAUDE.md sections 47, 51).
     *
     * <p>Phase 7 pulled this up from the individual features so that every private read is audited
     * the same way, in one place. Before, each owning resource wrote its own PRIVATE_FILE_ACCESSED
     * event, which meant the next feature to expose a document could simply forget to — and an
     * unaudited read of a student's evidence is exactly the access nobody would notice.
     *
     * <p>The event carries identifiers only: never the storage key, never the filename, never any
     * content (CLAUDE.md section 68).
     *
     * @param context short, safe scope for the event, e.g. {@code "placementId=..."}. Callers must
     *                not pass anything derived from the document itself.
     */
    public InputStream openAudited(StoredFile file, UUID actingUserId, String context, String ipAddress, String userAgent) {
        audit.record("PRIVATE_FILE_ACCESSED", actingUserId, ipAddress, userAgent,
                "storedFileId=" + file.getId() + ";classification=" + file.getClassification()
                        + (context == null || context.isBlank() ? "" : ";" + context));
        return open(file);
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

    private void requirePresent(MultipartFile upload, FileClassification classification) {
        if (upload == null || upload.isEmpty()) {
            throw invalidFile(classification, "Choose a document to upload.");
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
            throw invalidFile(classification, "The document type could not be determined.");
        }
        // Strip any "; charset=..." parameter before comparing.
        String normalized = declared.split(";")[0].trim().toLowerCase(Locale.ROOT);
        if (!classification.permittedContentTypes().contains(normalized)) {
            throw invalidFile(classification, "That document type is not accepted.");
        }
        return normalized;
    }

    /**
     * Rejects an upload whose bytes do not match the type it claims. See {@link #MAGIC_BYTES}.
     *
     * <p>A permitted content type with no entry in that map would pass unchecked, so every type in
     * {@link FileClassification} must have one — which is why the two are kept next to each other.
     */
    private void requireMagicBytes(MultipartFile upload, FileClassification classification, String contentType) {
        byte[] expected = MAGIC_BYTES.get(contentType);
        if (expected == null) {
            return;
        }
        try (InputStream in = upload.getInputStream()) {
            byte[] header = in.readNBytes(expected.length);
            if (header.length < expected.length) {
                throw invalidFile(classification, "That document does not match its file type.");
            }
            for (int i = 0; i < expected.length; i++) {
                if (header[i] != expected[i]) {
                    throw invalidFile(classification, "That document does not match its file type.");
                }
            }
        } catch (IOException e) {
            throw invalidFile(classification, "The uploaded document could not be read.");
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

    private ApiException invalidFile(FileClassification classification, String message) {
        return new ApiException(classification.invalidFileErrorCode(), HttpStatus.BAD_REQUEST, message);
    }
}
