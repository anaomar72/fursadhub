package com.fursadhub.common.api;

import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * Base type for business/domain failures that must surface as a stable {@link ApiError} code.
 * Feature modules throw subclasses (or this directly) instead of generic exceptions so the
 * global handler can render the machine-readable contract without guessing intent.
 */
public class ApiException extends RuntimeException {

    private final String code;
    private final HttpStatus status;
    private final List<ApiError.FieldError> fieldErrors;

    public ApiException(String code, HttpStatus status, String message) {
        this(code, status, message, List.of());
    }

    /**
     * A failure that carries structured detail alongside the top-level code.
     *
     * <p>Added in Phase 6 for placement completion, where a single
     * {@code PLACEMENT_COMPLETION_REQUIREMENTS_NOT_MET} may be caused by several unmet requirements
     * at once. Each one becomes a {@link ApiError.FieldError} with its own stable code, so the
     * frontend can list exactly what is outstanding without parsing the English message
     * (CLAUDE.md section 11). Existing throw sites are unaffected — they use the constructor above
     * and continue to render an empty {@code fieldErrors} array exactly as before.
     */
    public ApiException(String code, HttpStatus status, String message, List<ApiError.FieldError> fieldErrors) {
        super(message);
        this.code = code;
        this.status = status;
        this.fieldErrors = List.copyOf(fieldErrors);
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public List<ApiError.FieldError> getFieldErrors() {
        return fieldErrors;
    }
}
