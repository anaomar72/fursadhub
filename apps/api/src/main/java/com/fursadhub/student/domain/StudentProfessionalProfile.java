package com.fursadhub.student.domain;

import jakarta.validation.constraints.*;
import java.util.List;

/** Professional presentation only: deliberately excludes enrollment identity, evidence and CVs. */
public record StudentProfessionalProfile(
        @Size(max = 160) String headline,
        @Size(max = 3000) String summary,
        @Size(max = 120) String city,
        @Pattern(regexp = "[A-Z]{2}") String countryCode,
        @Size(max = 25) List<@NotBlank @Size(max = 60) String> skills,
        @Size(max = 500) String linkedinUrl,
        @Size(max = 500) String githubUrl,
        @Size(max = 500) String portfolioUrl) {
    public StudentProfessionalProfile {
        skills = skills == null ? List.of() : List.copyOf(skills);
    }
}
