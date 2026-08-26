package com.fursadhub.internshipmanagement.domain;

import java.util.List;

/**
 * The full, backend-computed answer to "may this placement complete, and if not why not?"
 *
 * <p>The frontend renders this and nothing else. It never re-derives requirements from the policy
 * itself, so the checklist a student sees and the rules the completion command enforces cannot drift
 * apart (Phase 6 section 30/33).
 */
public record PlacementCompletionStatus(
        ResolvedInternshipPolicy policy,
        List<CompletionRequirementStatus> requirements) {

    public boolean canComplete() {
        return unmet().isEmpty();
    }

    /** The enabled-but-unsatisfied requirements, in the frozen requirement order. */
    public List<CompletionRequirementStatus> unmet() {
        return requirements.stream().filter(CompletionRequirementStatus::blocksCompletion).toList();
    }
}
