package com.fursadhub.verification.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Shared body shape for request-more-evidence / reject / revoke, which all carry one free-text note. */
public record ReviewNoteRequest(@NotBlank @Size(max = 2000) String notes) {
}
