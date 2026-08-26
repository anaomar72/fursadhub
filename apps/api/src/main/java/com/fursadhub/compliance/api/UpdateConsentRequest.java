package com.fursadhub.compliance.api;

import jakarta.validation.constraints.NotNull;

public record UpdateConsentRequest(@NotNull Boolean granted) {
}
