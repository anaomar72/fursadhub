package com.fursadhub.common.api;

import java.time.Instant;
import java.util.List;

/**
 * Stable, machine-readable error contract for every FursadHub API error response.
 * Frontend logic must key off {@code code}, never parse {@code message}.
 */
public record ApiError(
        String code,
        String message,
        int status,
        String path,
        Instant timestamp,
        List<FieldError> fieldErrors) {

    public record FieldError(String field, String code, String message) {
    }

    public static ApiError of(String code, String message, int status, String path) {
        return new ApiError(code, message, status, path, Instant.now(), List.of());
    }

    public static ApiError of(String code, String message, int status, String path, List<FieldError> fieldErrors) {
        return new ApiError(code, message, status, path, Instant.now(), fieldErrors);
    }
}
