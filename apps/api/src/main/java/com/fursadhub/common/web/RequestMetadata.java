package com.fursadhub.common.web;

import jakarta.servlet.http.HttpServletRequest;

/** Small shared helpers for safe audit metadata extraction (CLAUDE.md section 51/68). */
public final class RequestMetadata {

    private RequestMetadata() {
    }

    public static String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    public static String userAgent(HttpServletRequest request) {
        String value = request.getHeader("User-Agent");
        return value == null ? null : (value.length() > 255 ? value.substring(0, 255) : value);
    }
}
