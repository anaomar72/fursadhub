package com.fursadhub.organization.domain;

/**
 * How large an organization is, as a BAND rather than a headcount (Backend Phase B2).
 *
 * <p>A band is deliberate. An exact employee count is stale the week after it is entered, nobody
 * maintains it, and a number shown next to a verified badge implies FursadHub checked it. A band is
 * something an organization can answer honestly once and rarely revisit.
 *
 * <p>Optional on every organization: existing rows have none, and nothing requires one.
 *
 * <p>This is an organization concept only — it is never applied to a university, whose scale is
 * described by its own academic structure rather than by headcount.
 */
public enum CompanySizeRange {
    SIZE_1_10,
    SIZE_11_50,
    SIZE_51_200,
    SIZE_201_500,
    SIZE_501_1000,
    SIZE_1001_5000,
    SIZE_5001_PLUS
}
