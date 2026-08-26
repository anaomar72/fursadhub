package com.fursadhub.compliance.api;

import jakarta.validation.constraints.Size;

/** What the administrator did about a privacy request, or why they could not. */
public record ResolutionNoteRequest(@Size(max = 4000) String note) {
}
