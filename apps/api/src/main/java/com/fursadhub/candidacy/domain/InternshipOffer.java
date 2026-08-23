package com.fursadhub.candidacy.domain;

import com.fursadhub.common.api.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A concrete internship offer made to one candidate (CLAUDE.md section 38). Offer information is
 * never stored merely as a candidacy status — dates, response deadline, location and details live
 * here, and a candidacy can only be {@code OFFERED} because one of these exists.
 *
 * <p>Expiry is derived, not scheduled: {@link #isPastDeadline(LocalDate)} lets read and accept
 * paths lazily transition a lapsed offer inside the transaction that noticed it, so the pilot needs
 * no background scheduler or extra infrastructure (CLAUDE.md section 3 — do not add infrastructure
 * before FursadHub actually needs it).
 */
@Entity
@Table(name = "internship_offers")
public class InternshipOffer {

    @Id
    private UUID id;

    @Column(name = "candidacy_id", nullable = false)
    private UUID candidacyId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "response_deadline", nullable = false)
    private LocalDate responseDeadline;

    @Column(length = 255)
    private String location;

    @Column(length = 2000)
    private String details;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OfferStatus status;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    protected InternshipOffer() {
    }

    public static InternshipOffer send(
            UUID candidacyId, LocalDate startDate, LocalDate endDate, LocalDate responseDeadline, String location,
            String details, UUID createdBy) {
        Instant now = Instant.now();
        InternshipOffer offer = new InternshipOffer();
        offer.id = UUID.randomUUID();
        offer.candidacyId = candidacyId;
        offer.startDate = startDate;
        offer.endDate = endDate;
        offer.responseDeadline = responseDeadline;
        offer.location = location;
        offer.details = details;
        offer.status = OfferStatus.PENDING;
        offer.createdBy = createdBy;
        offer.createdAt = now;
        offer.updatedAt = now;
        return offer;
    }

    public void accept() {
        requirePending();
        this.status = OfferStatus.ACCEPTED;
        touchResponse();
    }

    public void decline() {
        requirePending();
        this.status = OfferStatus.DECLINED;
        touchResponse();
    }

    /** Lazy expiry — applied by whichever transaction first observes the lapsed deadline. */
    public void expire() {
        requirePending();
        this.status = OfferStatus.EXPIRED;
        this.updatedAt = Instant.now();
    }

    /** Organization retracting an offer the student has not yet responded to. */
    public void withdraw() {
        requirePending();
        this.status = OfferStatus.WITHDRAWN;
        this.updatedAt = Instant.now();
    }

    public boolean isPending() {
        return status == OfferStatus.PENDING;
    }

    public boolean isAccepted() {
        return status == OfferStatus.ACCEPTED;
    }

    /** The deadline is inclusive: a student may still respond on the deadline date itself. */
    public boolean isPastDeadline(LocalDate today) {
        return today.isAfter(responseDeadline);
    }

    private void requirePending() {
        if (status != OfferStatus.PENDING) {
            throw new ApiException("OFFER_NOT_PENDING", HttpStatus.CONFLICT,
                    "This offer is no longer awaiting a response.");
        }
    }

    private void touchResponse() {
        Instant now = Instant.now();
        this.respondedAt = now;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCandidacyId() {
        return candidacyId;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public LocalDate getResponseDeadline() {
        return responseDeadline;
    }

    public String getLocation() {
        return location;
    }

    public String getDetails() {
        return details;
    }

    public OfferStatus getStatus() {
        return status;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getRespondedAt() {
        return respondedAt;
    }
}
