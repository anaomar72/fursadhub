package com.fursadhub.university.api;

import com.fursadhub.common.api.PatchField;
import com.fursadhub.identity.domain.DisplayNamePolicy;
import jakarta.validation.constraints.Size;

/**
 * Sets or clears a managed staff member's display name (Backend Phase B5).
 *
 * <p>An explicit command with a single field, matching how every other staff mutation on this
 * resource works (role, suspend, reactivate, reset-password, revoke) — CLAUDE.md section 10 and
 * section 26A both call for explicit operations rather than a generic mutation endpoint.
 *
 * <p><strong>The field is presence-aware, and required to be present.</strong> A plain
 * {@code String} cannot tell {@code {}} from {@code {"displayName": null}} — Jackson yields null for
 * both — which would let an EMPTY PAYLOAD silently erase a stored name. That is unacceptable for a
 * mutation command, so this reuses the {@link PatchField} mechanism B2/B3 established: omitted is
 * rejected as {@code VALIDATION_FAILED}, while an explicit null still clears.
 */
public record ChangeStaffDisplayNameRequest(
        @Size(max = DisplayNamePolicy.MAX_LENGTH) PatchField<String> displayName) {
}
