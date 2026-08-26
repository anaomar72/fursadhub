package com.fursadhub.common.api;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

/**
 * Renders every API error as the stable {@link ApiError} contract defined in CLAUDE.md section 11.
 * Frontend code must branch on {@code code}, never on {@code message}.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApiException(ApiException ex, HttpServletRequest request) {
        // fieldErrors is empty for almost every ApiException; Phase 6 completion failures use it to
        // report each unmet requirement with its own stable code (CLAUDE.md section 11).
        return build(ex.getCode(), ex.getMessage(), ex.getStatus(), request, ex.getFieldErrors());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ApiError.FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(this::toFieldError)
                .toList();
        return build("VALIDATION_FAILED", "One or more fields are invalid.", HttpStatus.BAD_REQUEST, request, fieldErrors);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadable(HttpServletRequest request) {
        return build("VALIDATION_FAILED", "The request body could not be read.", HttpStatus.BAD_REQUEST, request, List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(HttpServletRequest request) {
        return build("ACCESS_DENIED", "You do not have access to this resource.", HttpStatus.FORBIDDEN, request, List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build("INTERNAL_ERROR", "An unexpected error occurred.", HttpStatus.INTERNAL_SERVER_ERROR, request, List.of());
    }

    private ApiError.FieldError toFieldError(FieldError fieldError) {
        return new ApiError.FieldError(
                fieldError.getField(),
                "INVALID",
                fieldError.getDefaultMessage());
    }

    private ResponseEntity<ApiError> build(
            String code, String message, HttpStatus status, HttpServletRequest request, List<ApiError.FieldError> fieldErrors) {
        ApiError body = ApiError.of(code, message, status.value(), request.getRequestURI(), fieldErrors);
        return ResponseEntity.status(status).body(body);
    }
}
