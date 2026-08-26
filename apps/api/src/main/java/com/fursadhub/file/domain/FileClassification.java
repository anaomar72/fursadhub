package com.fursadhub.file.domain;

import java.util.Set;

/**
 * What a stored file IS, which decides the upload policy that applies to it (CLAUDE.md section 48).
 *
 * <p>Phase 6 needs exactly one classification. Phase 7's general file platform adds the rest —
 * CVs, verification evidence — along with their own limits; deliberately not pre-created here, since
 * an unused classification is an unvalidated upload path waiting to be wired up by mistake.
 */
public enum FileClassification {

    /** The student's final internship report. PDF only (CLAUDE.md section 48). */
    FINAL_REPORT(Set.of("application/pdf"), 15L * 1024 * 1024);

    private final Set<String> permittedContentTypes;
    private final long maxSizeBytes;

    FileClassification(Set<String> permittedContentTypes, long maxSizeBytes) {
        this.permittedContentTypes = permittedContentTypes;
        this.maxSizeBytes = maxSizeBytes;
    }

    public Set<String> permittedContentTypes() {
        return permittedContentTypes;
    }

    public long maxSizeBytes() {
        return maxSizeBytes;
    }
}
