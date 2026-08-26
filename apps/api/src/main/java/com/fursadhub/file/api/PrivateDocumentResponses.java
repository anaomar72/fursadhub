package com.fursadhub.file.api;

import com.fursadhub.file.domain.StoredFile;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Builds the HTTP response for a private document download.
 *
 * <p>Phase 6 wrote this inline in one controller. Phase 7 has three more download routes — the CV,
 * the verification evidence, and their administrative counterparts — and every one of them needs the
 * same four headers to be safe. Sharing the builder means a future download route cannot quietly
 * omit one:
 *
 * <ul>
 *   <li>{@code Content-Disposition: attachment} so the browser saves the file instead of rendering
 *       it inside FursadHub's own origin, where a crafted document could act as same-origin content;</li>
 *   <li>an RFC 5987 encoded filename, so the (already sanitized) original name cannot inject header
 *       content;</li>
 *   <li>an explicit {@code Content-Type} rather than letting the browser sniff one;</li>
 *   <li>{@code Cache-Control: no-store}, so a student's private document is never held by an
 *       intermediary or left in the browser's disk cache.</li>
 * </ul>
 *
 * <p>This class does no authorization. The caller must already have decided the requester may read
 * this document — which is always the business resource that owns it, since that is the only thing
 * that knows.
 */
public final class PrivateDocumentResponses {

    private PrivateDocumentResponses() {
    }

    public static ResponseEntity<InputStreamResource> attachment(StoredFile metadata, InputStream content) {
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(metadata.getOriginalFilename(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .contentLength(metadata.getSizeBytes())
                .body(new InputStreamResource(content));
    }
}
