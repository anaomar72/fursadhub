package com.fursadhub.internshipmanagement.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The frozen final-report state machine (CLAUDE.md section 45). */
class FinalReportTest {

    private static final UUID PLACEMENT = UUID.randomUUID();
    private static final UUID REVIEWER = UUID.randomUUID();

    private FinalReport withDocument() {
        FinalReport report = FinalReport.createDraft(PLACEMENT);
        report.attachFile(UUID.randomUUID());
        return report;
    }

    @Test
    void aReportWithoutADocumentCannotBeSubmitted() {
        FinalReport report = FinalReport.createDraft(PLACEMENT);

        assertThatThrownBy(report::submit)
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "FINAL_REPORT_FILE_MISSING");
    }

    @Test
    void attachingANewDocumentReturnsTheOneItReplaced() {
        FinalReport report = FinalReport.createDraft(PLACEMENT);
        UUID first = UUID.randomUUID();
        report.attachFile(first);

        UUID replaced = report.attachFile(UUID.randomUUID());

        assertThat(replaced).isEqualTo(first);
    }

    @Test
    void draftMovesToSubmittedThenApproved() {
        FinalReport report = withDocument();

        report.submit();
        assertThat(report.getState()).isEqualTo(FinalReportState.SUBMITTED);
        assertThat(report.countsTowardsCompletion()).isFalse();

        report.approve(REVIEWER, "Well structured.");
        assertThat(report.getState()).isEqualTo(FinalReportState.APPROVED);
        assertThat(report.getReviewedBy()).isEqualTo(REVIEWER);
        assertThat(report.countsTowardsCompletion()).isTrue();
    }

    @Test
    void revisionSendsItBackToTheStudentWhoMayReplaceTheDocumentAndResubmit() {
        FinalReport report = withDocument();
        report.submit();

        report.requestRevision(REVIEWER, "Expand the reflection section.");
        assertThat(report.getState()).isEqualTo(FinalReportState.NEEDS_REVISION);
        assertThat(report.isFileEditable()).isTrue();
        assertThat(report.getReviewComment()).isEqualTo("Expand the reflection section.");

        report.attachFile(UUID.randomUUID());
        report.submit();
        assertThat(report.getState()).isEqualTo(FinalReportState.SUBMITTED);
    }

    @Test
    void anApprovedReportIsSealed() {
        FinalReport report = withDocument();
        report.submit();
        report.approve(REVIEWER, null);

        // APPROVED is absent from the transition table, so nothing moves it and the document
        // cannot be swapped afterwards.
        assertThatThrownBy(report::submit).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> report.requestRevision(REVIEWER, "On reflection..."))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> report.attachFile(UUID.randomUUID()))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "FINAL_REPORT_INVALID_TRANSITION");
        assertThat(report.isFileEditable()).isFalse();
    }

    @Test
    void aSubmittedReportIsWithTheReviewerAndItsDocumentCannotBeSwapped() {
        FinalReport report = withDocument();
        report.submit();

        assertThat(report.isFileEditable()).isFalse();
        assertThatThrownBy(() -> report.attachFile(UUID.randomUUID()))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void aDraftCannotBeApprovedWithoutBeingSubmitted() {
        FinalReport report = withDocument();

        assertThatThrownBy(() -> report.approve(REVIEWER, null))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "FINAL_REPORT_INVALID_TRANSITION");
    }
}
