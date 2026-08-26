package com.fursadhub.internshipmanagement.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Editing a log the student still owns. The week number is fixed at creation and never moves. */
public record WeeklyLogEditRequest(
        @NotBlank @Size(max = 2000) String summary,
        @Size(max = 4000) String activities,
        @Size(max = 2000) String challenges,
        @Size(max = 2000) String learningOutcomes) {
}
