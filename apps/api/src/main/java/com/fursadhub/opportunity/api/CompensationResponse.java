package com.fursadhub.opportunity.api;

import com.fursadhub.opportunity.domain.Compensation;

import java.math.BigDecimal;

/**
 * Compensation as it leaves the API (Backend Phase B3) — the same structured shape on the public
 * and the management surface, because there is nothing private about what an internship pays.
 *
 * <p>FursadHub returns the components and lets the client format them. It deliberately does NOT
 * return a pre-rendered string: the listing is bilingual (CLAUDE.md section 56), so "200 per month"
 * and "200 bishiiba" are a rendering concern, not a storage one. It equally does not derive an
 * annualised figure — that would be a number the organization never stated.
 */
public record CompensationResponse(
        String type,
        String currencyCode,
        BigDecimal minimumAmount,
        BigDecimal maximumAmount,
        String period) {

    /** Null in, null out — so an opportunity that has said nothing about pay omits the field entirely. */
    public static CompensationResponse from(Compensation compensation) {
        if (compensation == null) {
            return null;
        }
        return new CompensationResponse(
                compensation.type().name(),
                compensation.currencyCode(),
                compensation.minimumAmount(),
                compensation.maximumAmount(),
                compensation.period() == null ? null : compensation.period().name());
    }
}
