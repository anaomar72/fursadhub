package com.fursadhub.candidacy.domain;

/**
 * Stable event-type names written into {@link CandidacyEvent#getEventType()}. Kept as constants
 * rather than an enum because this is an append-only audit log: historical rows must remain
 * readable even if the product later stops emitting one of these names.
 */
public final class CandidacyEventType {

    public static final String APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED";
    public static final String NOMINATION_ACCEPTED = "NOMINATION_ACCEPTED";
    public static final String SOURCE_MERGED_TO_BOTH = "SOURCE_MERGED_TO_BOTH";
    public static final String MOVED_UNDER_REVIEW = "MOVED_UNDER_REVIEW";
    public static final String SHORTLISTED = "SHORTLISTED";
    public static final String MOVED_TO_INTERVIEW = "MOVED_TO_INTERVIEW";
    public static final String OFFER_SENT = "OFFER_SENT";
    public static final String OFFER_ACCEPTED = "OFFER_ACCEPTED";
    public static final String OFFER_DECLINED = "OFFER_DECLINED";
    public static final String OFFER_EXPIRED = "OFFER_EXPIRED";
    public static final String CANDIDACY_REJECTED = "CANDIDACY_REJECTED";
    public static final String CANDIDACY_WITHDRAWN = "CANDIDACY_WITHDRAWN";
    public static final String PLACEMENT_CREATED = "PLACEMENT_CREATED";

    private CandidacyEventType() {
    }
}
