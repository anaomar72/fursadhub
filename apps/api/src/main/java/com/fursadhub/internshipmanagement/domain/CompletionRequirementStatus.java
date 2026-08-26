package com.fursadhub.internshipmanagement.domain;

/**
 * One line of the completion checklist (Phase 6 sections 21-24, 33).
 *
 * <p>{@code required == false} means this placement's policy does not ask for it at all: the UI must
 * hide it rather than render it as an unmet item, and the completion check must not let it block
 * anything. That distinction — disabled versus unsatisfied — is why this carries two booleans rather
 * than one.
 *
 * <p>{@code detail} is a short machine-readable hint (for example "3/12") that the frontend renders
 * next to the translated label. It is never a sentence, because the frontend must never parse prose.
 */
public record CompletionRequirementStatus(
        CompletionRequirementType type,
        boolean required,
        boolean satisfied,
        String detail) {

    public static CompletionRequirementStatus notRequired(CompletionRequirementType type) {
        return new CompletionRequirementStatus(type, false, true, null);
    }

    public static CompletionRequirementStatus of(
            CompletionRequirementType type, boolean satisfied, String detail) {
        return new CompletionRequirementStatus(type, true, satisfied, detail);
    }

    /** Enabled and unsatisfied — the only combination that blocks completion. */
    public boolean blocksCompletion() {
        return required && !satisfied;
    }
}
