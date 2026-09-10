package com.fursadhub.testimonial.api;

import jakarta.validation.constraints.Size;

/** The moderator's reason. Required for reject; optional when taking a quote back off the site. */
public record ModerationNoteRequest(@Size(max = 1000) String note) {
}
