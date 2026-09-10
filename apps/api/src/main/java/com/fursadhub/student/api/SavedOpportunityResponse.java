package com.fursadhub.student.api;

import com.fursadhub.opportunity.api.PublicOpportunityResponse;

import java.time.Instant;

/**
 * One entry in a student's Saved Internships list (Backend Phase B4): when they saved it, and the
 * opportunity itself in exactly the PUBLIC representation.
 *
 * <p>Reusing {@link PublicOpportunityResponse} verbatim — rather than defining a saved-specific
 * opportunity shape — is what guarantees the saved list can never expose more than the public
 * detail endpoint does, and it carries the Backend Phase B3 enrichment (compensation, skills, perks,
 * hours) for free. A parallel DTO would be one more thing to keep in step.
 *
 * <p>Nothing about the bookmark itself is exposed beyond {@code savedAt}: no bookmark id the client
 * has no use for, and no student identifiers, since the only student who can read this is the one
 * the row belongs to.
 */
public record SavedOpportunityResponse(Instant savedAt, PublicOpportunityResponse opportunity) {
}
