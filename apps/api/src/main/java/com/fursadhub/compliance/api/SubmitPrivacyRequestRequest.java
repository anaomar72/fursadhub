package com.fursadhub.compliance.api;

import com.fursadhub.compliance.domain.PrivacyRequestType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The subject is NOT part of this body. It is always the authenticated caller
 * (CLAUDE.md section 12), so nobody can file a request in someone else's name.
 */
public record SubmitPrivacyRequestRequest(
        @NotNull PrivacyRequestType requestType,
        @Size(max = 4000) String details) {
}
