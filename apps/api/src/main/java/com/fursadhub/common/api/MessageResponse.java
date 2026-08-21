package com.fursadhub.common.api;

/** Generic acknowledgement body for endpoints that only need to confirm success. */
public record MessageResponse(String message) {
}
