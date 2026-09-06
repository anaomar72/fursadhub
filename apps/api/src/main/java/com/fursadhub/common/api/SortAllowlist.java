package com.fursadhub.common.api;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Maps a small set of client-facing sort KEYS onto the {@link Sort} objects they are allowed to
 * produce, so no client-supplied string ever reaches Spring Data as a property name.
 *
 * <p>This matters most on the unauthenticated directory endpoints. Binding a {@code Pageable}
 * directly would let an anonymous caller write {@code ?sort=registrationNumber,asc} or
 * {@code ?sort=verificationStatus,desc} and <em>infer private column values from the resulting
 * order</em> — without any of those fields ever appearing in the response body. An allowlist
 * removes the channel rather than trying to sanitise it.
 *
 * <p>An unrecognised key is REJECTED, not silently ignored: a caller who asked for an ordering and
 * quietly received a different one has been misled. Rejection follows the existing convention for a
 * bad query parameter — {@code 400 VALIDATION_FAILED} with a {@code fieldErrors} entry naming the
 * parameter (see {@code GlobalExceptionHandler.handleTypeMismatch}).
 */
public final class SortAllowlist {

    private final String parameterName;
    private final Map<String, Sort> allowed;
    private final String defaultKey;

    private SortAllowlist(String parameterName, Map<String, Sort> allowed, String defaultKey) {
        this.parameterName = parameterName;
        this.allowed = Map.copyOf(allowed);
        this.defaultKey = defaultKey;
    }

    public static Builder forParameter(String parameterName) {
        return new Builder(parameterName);
    }

    /**
     * Resolves a client-supplied key. A null or blank key yields the default ordering; anything not
     * on the allowlist throws.
     */
    public Sort resolve(String key) {
        String requested = (key == null || key.isBlank()) ? defaultKey : key.trim();
        Sort sort = allowed.get(requested);
        if (sort == null) {
            throw new ApiException(
                    "VALIDATION_FAILED",
                    HttpStatus.BAD_REQUEST,
                    "One or more request parameters are invalid.",
                    List.of(new ApiError.FieldError(
                            parameterName,
                            "INVALID",
                            "Unsupported sort. Allowed values: " + String.join(", ", allowedKeys()) + ".")));
        }
        return sort;
    }

    /** The permitted keys, in declaration order — the default first. Useful for OpenAPI and tests. */
    public List<String> allowedKeys() {
        return List.copyOf(allowed.keySet().stream().sorted().toList());
    }

    public static final class Builder {

        private final String parameterName;
        private final Map<String, Sort> allowed = new LinkedHashMap<>();
        private String defaultKey;

        private Builder(String parameterName) {
            this.parameterName = parameterName;
        }

        /** The first key added becomes the default ordering when the caller sends none. */
        public Builder allow(String key, Sort sort) {
            if (defaultKey == null) {
                defaultKey = key;
            }
            allowed.put(key, sort);
            return this;
        }

        public SortAllowlist build() {
            if (defaultKey == null) {
                throw new IllegalStateException("A SortAllowlist needs at least one allowed sort.");
            }
            return new SortAllowlist(parameterName, allowed, defaultKey);
        }
    }
}
