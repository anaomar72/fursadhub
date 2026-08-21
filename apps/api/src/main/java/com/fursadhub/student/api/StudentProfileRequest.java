package com.fursadhub.student.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudentProfileRequest(
        @NotBlank @Size(max = 255) String fullName,
        @Size(max = 40) String phone) {
}
