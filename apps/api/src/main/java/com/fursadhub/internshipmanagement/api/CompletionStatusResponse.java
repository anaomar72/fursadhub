package com.fursadhub.internshipmanagement.api;

import com.fursadhub.internshipmanagement.domain.CompletionRequirementStatus;
import com.fursadhub.internshipmanagement.domain.PlacementCompletionStatus;

import java.util.List;

/**
 * The backend-computed completion checklist (Phase 6 sections 30/33).
 *
 * <p>This is the ONLY thing the UI renders. It never re-derives requirements from the policy, so the
 * checklist a student sees is literally the computation the completion command enforces.
 *
 * <p>{@code required=false} means the placement's policy does not ask for that item at all — the UI
 * must HIDE it rather than draw it as an unmet requirement. That distinction is why each row carries
 * both {@code required} and {@code satisfied}.
 */
public record CompletionStatusResponse(
        boolean canComplete,
        String policySource,
        List<RequirementResponse> requirements) {

    /**
     * @param unmetCode the stable code reported if this requirement blocks completion, so the UI can
     *                  match a checklist row to a {@code fieldErrors} entry without parsing prose
     * @param detail    a short machine-readable hint such as "3/12" or "SUBMITTED", never a sentence
     */
    public record RequirementResponse(
            String type,
            boolean required,
            boolean satisfied,
            String detail,
            String unmetCode) {

        static RequirementResponse from(CompletionRequirementStatus status) {
            return new RequirementResponse(
                    status.type().name(),
                    status.required(),
                    status.satisfied(),
                    status.detail(),
                    status.type().unmetCode());
        }
    }

    public static CompletionStatusResponse from(PlacementCompletionStatus status) {
        return new CompletionStatusResponse(
                status.canComplete(),
                status.policy().source().name(),
                status.requirements().stream().map(RequirementResponse::from).toList());
    }
}
