package com.fursadhub.file.domain;

import java.util.Set;

/**
 * What a stored file IS, which decides the upload policy that applies to it and the error code a
 * rejected upload reports (CLAUDE.md section 48).
 *
 * <p>Phase 6 created this with exactly one value, on the principle that an unused classification is
 * an unvalidated upload path waiting to be wired up by mistake. Phase 7 adds the two other document
 * types CLAUDE.md section 47 names, each with its own limits and each reachable only through the
 * business resource that owns it — there is still no generic upload endpoint.
 *
 * <p>Archives and executables are absent on purpose: CLAUDE.md section 48 forbids accepting them for
 * convenience, and a container format would let anything at all through a content-type check.
 */
public enum FileClassification {

    /** The student's final internship report. PDF only (CLAUDE.md section 48). */
    FINAL_REPORT(Set.of("application/pdf"), 15L * 1024 * 1024, RetentionCategory.ACADEMIC_RECORD),

    /**
     * The student's CV, attached to their profile and readable by recruiters at organizations where
     * they have an active candidacy. PDF only and smaller than a report: a CV is a couple of pages,
     * and a generous cap here would only invite people to upload scans of something else.
     */
    CV(Set.of("application/pdf"), 5L * 1024 * 1024, RetentionCategory.STUDENT_RECORD),

    /**
     * Evidence supporting a university-enrollment claim — a student ID card, an enrollment letter
     * (CLAUDE.md section 31: "Verification evidence must remain private").
     *
     * <p>Images are permitted here and nowhere else, because the realistic evidence a student has to
     * hand is a phone photo of a card. JPEG and PNG only: no SVG, which is a script-bearing document
     * format rather than an image, and no HEIC, which most reviewers could not open.
     */
    VERIFICATION_EVIDENCE(
            Set.of("application/pdf", "image/jpeg", "image/png"),
            10L * 1024 * 1024,
            RetentionCategory.VERIFICATION_EVIDENCE);

    private final Set<String> permittedContentTypes;
    private final long maxSizeBytes;
    private final RetentionCategory retentionCategory;

    FileClassification(Set<String> permittedContentTypes, long maxSizeBytes, RetentionCategory retentionCategory) {
        this.permittedContentTypes = permittedContentTypes;
        this.maxSizeBytes = maxSizeBytes;
        this.retentionCategory = retentionCategory;
    }

    public Set<String> permittedContentTypes() {
        return permittedContentTypes;
    }

    public long maxSizeBytes() {
        return maxSizeBytes;
    }

    public RetentionCategory retentionCategory() {
        return retentionCategory;
    }

    /**
     * The stable error code a rejected upload of this kind reports. Per-classification so the
     * frontend can put the message next to the right field, and so Phase 6's existing
     * {@code FINAL_REPORT_FILE_INVALID} contract keeps working unchanged.
     */
    public String invalidFileErrorCode() {
        return switch (this) {
            case FINAL_REPORT -> "FINAL_REPORT_FILE_INVALID";
            case CV -> "CV_FILE_INVALID";
            case VERIFICATION_EVIDENCE -> "EVIDENCE_FILE_INVALID";
        };
    }
}
