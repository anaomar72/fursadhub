package com.fursadhub.file.domain;

import java.io.InputStream;

/**
 * The port to private object storage (CLAUDE.md section 47, ADR-004).
 *
 * <p>Notice what is NOT here: there is no {@code getUrl}, no {@code getPublicUrl} and no
 * {@code presign}. FursadHub never hands a browser a direct storage URL for a private document —
 * every read is streamed through the API after the owning resource has authorized the caller. Adding
 * a URL-returning method to this interface would quietly undo that, so the port simply does not
 * offer one.
 */
public interface PrivateFileStorage {

    void put(String storageKey, String contentType, long sizeBytes, InputStream content);

    /** Opens the object for streaming. The caller closes it. */
    InputStream open(String storageKey);

    void delete(String storageKey);
}
