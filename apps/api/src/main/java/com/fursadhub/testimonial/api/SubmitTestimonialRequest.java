package com.fursadhub.testimonial.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The author's own words, the rating they gave, and the name they consent to publish.
 *
 * <p>Note what this record does NOT contain: a role, and an affiliation. It used to carry both, and
 * that is exactly how a recruiter could sign a quote "Student · Jamhuriya University". Both are now
 * resolved server-side from the authenticated caller's real membership, so there is no field to
 * spoof rather than a field that is validated. Removing them is the fix; validating them would not
 * have been one, since the server had no way to tell a true claim from a false one.
 *
 * <p>{@code authorDisplayName} stays with the author on purpose. A byline is a consent decision —
 * how much of their name a person wants beside a public quote — and an account email is not a
 * byline. Choosing how you are named is not the same as claiming a role you do not hold.
 *
 * <p>{@code rating} is required: a new testimonial always carries a real 1-5 score. Bean Validation
 * rejects a missing or out-of-range value here with the standard {@code VALIDATION_FAILED} field
 * error, and {@code Testimonial.submit} enforces the same rule in the domain so the constraint does
 * not depend on this DTO being the only way in.
 */
public record SubmitTestimonialRequest(
        @NotBlank @Size(max = 120) String authorDisplayName,
        @NotBlank @Size(min = 40, max = 1000) String body,
        @NotNull @Min(1) @Max(5) Integer rating) {
}
