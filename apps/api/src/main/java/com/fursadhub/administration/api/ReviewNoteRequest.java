package com.fursadhub.administration.api;

import jakarta.validation.constraints.Size;

/** A reviewer's note attached to a verification decision. */
public record ReviewNoteRequest(@Size(max = 2000) String note) {
}
