package com.fursadhub.administration.api;

import jakarta.validation.constraints.Size;

/** Why the account is being suspended. Recorded in the audit trail, not shown to the account holder. */
public record SuspendUserRequest(@Size(max = 500) String reason) {
}
