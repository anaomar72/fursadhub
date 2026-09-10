package com.fursadhub.common.api;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/**
 * Builds a bounded {@link PageRequest} from raw {@code page}/{@code size} query parameters.
 *
 * <p>Deliberately does NOT bind Spring's {@code Pageable} argument resolver. That resolver also
 * binds {@code ?sort=}, which on a public endpoint is a property-name passthrough — the exact
 * inference channel {@link SortAllowlist} exists to close. Taking the three values as plain
 * parameters keeps ordering under the allowlist's control.
 *
 * <p>Out-of-range values are clamped rather than rejected: a negative page or an oversized size is a
 * client mistake with an obvious safe reading, and an unauthenticated directory should not be a
 * source of 400s for it. A size of zero would produce an empty page forever, so it clamps up to 1.
 */
public final class PublicPageRequests {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 50;

    private PublicPageRequests() {
    }

    public static PageRequest of(Integer page, Integer size, Sort sort) {
        int safePage = (page == null || page < 0) ? 0 : page;
        int requestedSize = (size == null) ? DEFAULT_PAGE_SIZE : size;
        int safeSize = Math.min(Math.max(requestedSize, 1), MAX_PAGE_SIZE);
        return PageRequest.of(safePage, safeSize, sort);
    }
}
