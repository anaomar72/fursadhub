package com.fursadhub.common.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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

    /**
     * A path that exists for other verbs, called with the wrong one. Without this it fell through to
     * the catch-all below and was reported as {@code 500 INTERNAL_ERROR} — a client mistake dressed
     * up as a server fault, which both misleads the caller and pollutes the 500 rate that
     * CLAUDE.md section 68 asks operators to alert on.
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        return build("METHOD_NOT_ALLOWED", "This endpoint does not support that HTTP method.",
                HttpStatus.METHOD_NOT_ALLOWED, request, List.of());
    }

    /**
     * A path variable or query parameter that could not be converted to its declared type — a
     * malformed UUID, an unknown enum constant, an unparseable timestamp. These are the single
     * largest source of accidental 500s: every {@code /{id}} route in the API is reachable with a
     * non-UUID id, and every enum-typed filter with an unknown value.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        ApiError.FieldError fieldError = new ApiError.FieldError(ex.getName(), "INVALID", "Value is not valid for this parameter.");
        return build("VALIDATION_FAILED", "One or more request parameters are invalid.",
                HttpStatus.BAD_REQUEST, request, List.of(fieldError));
    }

    /** A declared, required query parameter that was not sent. */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> handleMissingParameter(
            MissingServletRequestParameterException ex, HttpServletRequest request) {
        ApiError.FieldError fieldError = new ApiError.FieldError(ex.getParameterName(), "REQUIRED", "This parameter is required.");
        return build("VALIDATION_FAILED", "A required request parameter is missing.",
                HttpStatus.BAD_REQUEST, request, List.of(fieldError));
    }

    /** Bean Validation on a path variable or request parameter (as opposed to a request body). */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(HttpServletRequest request) {
        return build("VALIDATION_FAILED", "One or more request parameters are invalid.",
                HttpStatus.BAD_REQUEST, request, List.of());
    }

    /** No route at all. Answered as a real 404 rather than a 500. */
    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public ResponseEntity<ApiError> handleNoHandler(HttpServletRequest request) {
        return build("NOT_FOUND", "No such endpoint.", HttpStatus.NOT_FOUND, request, List.of());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiError> handleUnsupportedMediaType(HttpServletRequest request) {
        return build("UNSUPPORTED_MEDIA_TYPE", "This endpoint does not accept that content type.",
                HttpStatus.UNSUPPORTED_MEDIA_TYPE, request, List.of());
    }

    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<ApiError> handleNotAcceptable(HttpServletRequest request) {
        return build("NOT_ACCEPTABLE", "This endpoint cannot produce the requested content type.",
                HttpStatus.NOT_ACCEPTABLE, request, List.of());
    }

    /**
     * An upload past the servlet container's ceiling. FursadHub's own per-classification size caps
     * (CLAUDE.md section 48) reject smaller files first with their own code; this catches the ones
     * too large for the container to even hand to the controller.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> handleUploadTooLarge(HttpServletRequest request) {
        return build("FILE_TOO_LARGE", "The uploaded file is too large.",
                HttpStatus.PAYLOAD_TOO_LARGE, request, List.of());
    }

    /**
     * A database constraint refused the write — almost always a uniqueness race on one of the
     * invariants CLAUDE.md section 52 requires to exist in PostgreSQL as well as in Java.
     *
     * <p>This is a SAFETY NET, not the preferred path. The concurrency-critical flows
     * (attendance, weekly logs, defense attempts, evaluations, final reports, terms acceptance,
     * platform grants) already catch this inside their own service and translate it into a specific
     * code such as {@code ATTENDANCE_ALREADY_RECORDED} — those still win, because they catch first.
     * What this adds is that anything they do not cover comes back as a truthful 409 "you tried to
     * create something that already exists" rather than a 500 implying the server is broken.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        // Logged at WARN, not ERROR: it is a losing race or a duplicate submit, not an outage.
        log.warn("Constraint violation on {} {}: {}", request.getMethod(), request.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return build("RESOURCE_CONFLICT", "That change conflicts with data that already exists.",
                HttpStatus.CONFLICT, request, List.of());
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
