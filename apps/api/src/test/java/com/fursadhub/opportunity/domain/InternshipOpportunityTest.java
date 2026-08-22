package com.fursadhub.opportunity.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InternshipOpportunityTest {

    private InternshipOpportunity newDraft() {
        return InternshipOpportunity.draft(
                UUID.randomUUID(), "Backend Intern", "Description", "Responsibilities", "Requirements",
                OpportunityMode.PUBLIC, 3, WorkMode.HYBRID, "Mogadishu",
                LocalDate.now().plusMonths(2), LocalDate.now().plusMonths(5), LocalDate.now().plusMonths(1),
                UUID.randomUUID());
    }

    @Test
    void newOpportunityStartsAsDraft() {
        assertThat(newDraft().getStatus()).isEqualTo(OpportunityStatus.DRAFT);
    }

    @Test
    void publishPauseResumeCloseHappyPath() {
        InternshipOpportunity opportunity = newDraft();

        opportunity.publish();
        assertThat(opportunity.getStatus()).isEqualTo(OpportunityStatus.PUBLISHED);
        assertThat(opportunity.getPublishedAt()).isNotNull();

        opportunity.pause();
        assertThat(opportunity.getStatus()).isEqualTo(OpportunityStatus.PAUSED);

        opportunity.resume();
        assertThat(opportunity.getStatus()).isEqualTo(OpportunityStatus.PUBLISHED);

        opportunity.close();
        assertThat(opportunity.getStatus()).isEqualTo(OpportunityStatus.CLOSED);
    }

    @Test
    void cancelIsAllowedFromDraftPublishedAndPaused() {
        InternshipOpportunity fromDraft = newDraft();
        fromDraft.cancel();
        assertThat(fromDraft.getStatus()).isEqualTo(OpportunityStatus.CANCELLED);

        InternshipOpportunity fromPublished = newDraft();
        fromPublished.publish();
        fromPublished.cancel();
        assertThat(fromPublished.getStatus()).isEqualTo(OpportunityStatus.CANCELLED);

        InternshipOpportunity fromPaused = newDraft();
        fromPaused.publish();
        fromPaused.pause();
        fromPaused.cancel();
        assertThat(fromPaused.getStatus()).isEqualTo(OpportunityStatus.CANCELLED);
    }

    @Test
    void cannotPublishAlreadyPublishedOpportunity() {
        InternshipOpportunity opportunity = newDraft();
        opportunity.publish();

        assertThatThrownBy(opportunity::publish)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("OPPORTUNITY_INVALID_TRANSITION");
    }

    @Test
    void cannotReopenAClosedOpportunity() {
        InternshipOpportunity opportunity = newDraft();
        opportunity.publish();
        opportunity.close();

        assertThatThrownBy(opportunity::resume)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("OPPORTUNITY_INVALID_TRANSITION");
        assertThatThrownBy(opportunity::publish)
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(opportunity::cancel)
                .isInstanceOf(ApiException.class);
    }

    @Test
    void cannotCancelAnAlreadyCancelledOpportunity() {
        InternshipOpportunity opportunity = newDraft();
        opportunity.cancel();

        assertThatThrownBy(opportunity::cancel)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("OPPORTUNITY_INVALID_TRANSITION");
    }

    @Test
    void editingIsRejectedOncePublished() {
        InternshipOpportunity opportunity = newDraft();
        opportunity.publish();

        assertThatThrownBy(() -> opportunity.applyEdits(
                "New title", "New description", null, null, OpportunityMode.PUBLIC, 1, WorkMode.REMOTE, null,
                LocalDate.now().plusMonths(3), LocalDate.now().plusMonths(6), LocalDate.now().plusMonths(2)))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("OPPORTUNITY_NOT_EDITABLE");
    }
}
