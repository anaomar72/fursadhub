package com.fursadhub.opportunity.domain;

/**
 * How an internship is compensated (Backend Phase B3).
 *
 * <p>A closed enum rather than free text because the listing filters and renders on it: "Unpaid"
 * and "Negotiable" are answers a student needs before applying, and a display string like
 * {@code "around 200/mo, negotiable"} can be neither compared nor translated into Somali.
 *
 * <p>Which amount fields each value permits is enforced by {@link Compensation}, not here.
 */
public enum CompensationType {

    /** No payment. Every amount, currency and period field must be absent. */
    UNPAID,

    /** One known amount, carried in {@code minimumAmount}. */
    FIXED,

    /** A band between {@code minimumAmount} and {@code maximumAmount}. */
    RANGE,

    /** Paid, but the amount is settled with the candidate. Amounts optional. */
    NEGOTIABLE
}
