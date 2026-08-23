package com.fursadhub.candidacy.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Offer lifecycle and deadline semantics (CLAUDE.md section 38, Phase 4 section 21). */
class InternshipOfferTest {

    private static final LocalDate DEADLINE = LocalDate.of(2027, 3, 10);

    private InternshipOffer offer() {
        return InternshipOffer.send(
                UUID.randomUUID(), LocalDate.of(2027, 4, 1), LocalDate.of(2027, 7, 1), DEADLINE,
                "Mogadishu", "Full time", UUID.randomUUID());
    }

    @Test
    void newOfferIsPending() {
        assertThat(offer().getStatus()).isEqualTo(OfferStatus.PENDING);
    }

    /** The deadline is inclusive — a student may still respond on the day itself. */
    @Test
    void deadlineDayItselfIsNotYetPast() {
        assertThat(offer().isPastDeadline(DEADLINE)).isFalse();
        assertThat(offer().isPastDeadline(DEADLINE.minusDays(1))).isFalse();
        assertThat(offer().isPastDeadline(DEADLINE.plusDays(1))).isTrue();
    }

    @Test
    void acceptedOfferCannotBeAcceptedAgain() {
        InternshipOffer offer = offer();
        offer.accept();

        assertThat(offer.isAccepted()).isTrue();
        assertThatThrownBy(offer::accept)
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "OFFER_NOT_PENDING");
    }

    @Test
    void declinedOfferCannotBeAccepted() {
        InternshipOffer offer = offer();
        offer.decline();

        assertThatThrownBy(offer::accept)
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "OFFER_NOT_PENDING");
    }

    @Test
    void expiredOfferCannotBeAccepted() {
        InternshipOffer offer = offer();
        offer.expire();

        assertThat(offer.getStatus()).isEqualTo(OfferStatus.EXPIRED);
        assertThatThrownBy(offer::accept)
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "OFFER_NOT_PENDING");
    }

    @Test
    void withdrawnOfferCannotBeAccepted() {
        InternshipOffer offer = offer();
        offer.withdraw();

        assertThat(offer.getStatus()).isEqualTo(OfferStatus.WITHDRAWN);
        assertThatThrownBy(offer::accept).isInstanceOf(ApiException.class);
    }

    @Test
    void respondingStampsTheResponseTime() {
        InternshipOffer offer = offer();
        assertThat(offer.getRespondedAt()).isNull();

        offer.accept();
        assertThat(offer.getRespondedAt()).isNotNull();
    }
}
