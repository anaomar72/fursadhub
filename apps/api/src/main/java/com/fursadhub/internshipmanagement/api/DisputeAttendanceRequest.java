package com.fursadhub.internshipmanagement.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The student's grounds for disputing a record. Required — a bare dispute is not actionable. */
public record DisputeAttendanceRequest(@NotBlank @Size(max = 1000) String reason) {
}
