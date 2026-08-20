package com.fursadhub.common.api;

import org.springframework.http.HttpStatus;

/**
 * Base type for business/domain failures that must surface as a stable {@link ApiError} code.
 * Feature modules throw subclasses (or this directly) instead of generic exceptions so the
 * global handler can render the machine-readable contract without guessing intent.
 */
public class ApiException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public ApiException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
