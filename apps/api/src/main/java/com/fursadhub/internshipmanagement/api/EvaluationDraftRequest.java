package com.fursadhub.internshipmanagement.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * The FIXED V1 evaluation form (CLAUDE.md section 44).
 *
 * <p>Six named ratings and three free-text fields. Not a rubric builder: there is no list of
 * questions here and no way for a client to introduce one.
 *
 * <p>Ratings are nullable so a supervisor can save a partial draft, and are enforced as mandatory at
 * submit. The 1-5 range is validated here, again in the domain, and again as a CHECK constraint in
 * the database (CLAUDE.md section 52).
 */
public record EvaluationDraftRequest(
        @Min(1) @Max(5) Short professionalismRating,
        @Min(1) @Max(5) Short reliabilityRating,
        @Min(1) @Max(5) Short communicationRating,
        @Min(1) @Max(5) Short workPerformanceRating,
        @Min(1) @Max(5) Short teamworkRating,
        @Min(1) @Max(5) Short overallRating,
        @Size(max = 2000) String strengths,
        @Size(max = 2000) String improvementAreas,
        @Size(max = 2000) String finalComments) {
}
