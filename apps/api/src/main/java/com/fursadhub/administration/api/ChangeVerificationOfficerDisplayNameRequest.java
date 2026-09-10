package com.fursadhub.administration.api;

import com.fursadhub.identity.domain.DisplayNamePolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Sets or replaces a managed verification officer's display name (Backend Phase B5.6).
 *
 * <p><strong>Replacement only — deliberately NOT the presence-aware {@code PatchField} used by the
 * institution display-name commands (Backend Phase B5).</strong> That distinction is the point of
 * this DTO, so it is worth stating why.
 *
 * <p>B5's tenant command supports THREE outcomes: leave alone, set, and clear. Because it can clear,
 * it must be able to tell an omitted property from an explicit null — otherwise {@code {}} would
 * silently erase a name. That is what {@code PatchField} exists for.
 *
 * <p>This command supports ONE outcome: set to a real name. A platform officer has no membership row
 * carrying an alternative identity, so an officer with no name shows in the console as a bare email
 * address; clearing is not an operation anyone needs and not one worth the risk of offering. With no
 * clear operation, "absent" and "null" both mean the same thing — the caller sent no name — so a
 * plain required field is not a shortcut here, it is the accurate model.
 *
 * <p>{@code @NotBlank} therefore rejects every no-name payload with the same {@code 400}: {@code {}},
 * an explicit null, {@code ""}, and whitespace. The one case it cannot see is a value made only of
 * Unicode space separators such as U+00A0, which {@code Character.isWhitespace} does not count;
 * {@link DisplayNamePolicy#normalize} collapses those to null and the service rejects it there.
 */
public record ChangeVerificationOfficerDisplayNameRequest(
        @NotBlank @Size(max = DisplayNamePolicy.MAX_LENGTH) String displayName) {
}
