package com.fursadhub.opportunity.domain;

/**
 * The unit an internship compensation amount is quoted in (Backend Phase B3).
 *
 * <p>{@link #TOTAL} means "for the whole internship" — common for a one-off stipend, and the reason
 * this is an explicit unit rather than an assumed monthly figure.
 *
 * <p>FursadHub deliberately does NOT derive an annualised salary from these values: an internship
 * has a start and an end date, and projecting a yearly figure from a stipend would invent a number
 * the organization never stated.
 */
public enum CompensationPeriod {
    HOUR,
    DAY,
    WEEK,
    MONTH,
    TOTAL
}
