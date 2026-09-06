package com.fursadhub.organization.api;

import com.fursadhub.common.api.PatchField;
import com.fursadhub.identity.domain.DisplayNamePolicy;
import jakarta.validation.constraints.Size;

/**
 * Sets or clears a managed staff member's display name (Backend Phase B5) — the organization
 * counterpart of {@code ChangeStaffDisplayNameRequest}. See it for why the field is presence-aware:
 * an omitted property must not be able to erase a stored name.
 */
public record ChangeOrganizationMemberDisplayNameRequest(
        @Size(max = DisplayNamePolicy.MAX_LENGTH) PatchField<String> displayName) {
}
