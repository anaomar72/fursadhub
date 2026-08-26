package com.fursadhub.internshipmanagement.api;

import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.internshipmanagement.domain.FinalReport;

import java.time.Instant;

/**
 * The final report's lifecycle and its document's METADATA.
 *
 * <p>There is no URL, no storage key and no download link in this response. The document is fetched
 * from a separate authorized endpoint that streams it through the API, so nothing here could ever be
 * turned into a shareable link to a private academic submission (CLAUDE.md section 47).
 */
public record FinalReportResponse(
        String id,
        String placementId,
        String state,
        boolean hasDocument,
        String documentFilename,
        Long documentSizeBytes,
        String submittedAt,
        String reviewedAt,
        String reviewComment,
        boolean fileEditable,
        String createdAt,
        String updatedAt) {

    public static FinalReportResponse from(FinalReport report, StoredFile document) {
        return new FinalReportResponse(
                report.getId().toString(),
                report.getPlacementId().toString(),
                report.getState().name(),
                report.getStoredFileId() != null,
                document == null ? null : document.getOriginalFilename(),
                document == null ? null : document.getSizeBytes(),
                text(report.getSubmittedAt()),
                text(report.getReviewedAt()),
                report.getReviewComment(),
                report.isFileEditable(),
                report.getCreatedAt().toString(),
                report.getUpdatedAt().toString());
    }

    private static String text(Instant instant) {
        return instant == null ? null : instant.toString();
    }
}
