package com.fursadhub.opportunity.api;

import com.fursadhub.opportunity.domain.Compensation;
import com.fursadhub.opportunity.domain.CompensationPeriod;
import com.fursadhub.opportunity.domain.CompensationType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

/**
 * Submitted compensation (Backend Phase B3).
 *
 * <p>The annotations here catch only what is decidable field by field — sign, magnitude, scale and
 * the shape of a currency code. Everything genuinely interesting about compensation is cross-field
 * (an {@code UNPAID} internship must carry no amount; {@code RANGE} needs both bounds in order) and
 * lives in {@link Compensation}, which is the single place those rules are enforced for both the
 * create and the update path.
 *
 * @param type          null means "nothing said about pay", which is NOT the same as {@code UNPAID}
 * @param minimumAmount the amount for {@code FIXED}, the lower bound for {@code RANGE}
 */
public record CompensationRequest(
        CompensationType type,

        /** Shape only; real ISO-4217 validity is checked in {@link Compensation}. */
        @Pattern(regexp = "^(?i)[a-z]{3}$", message = "Currency must be a three-letter ISO currency code.")
        String currencyCode,

        @DecimalMin(value = "0.0", message = "A compensation amount must not be negative.")
        @Digits(integer = 10, fraction = 2, message = "A compensation amount supports at most 2 decimal places.")
        BigDecimal minimumAmount,

        @DecimalMin(value = "0.0", message = "A compensation amount must not be negative.")
        @Digits(integer = 10, fraction = 2, message = "A compensation amount supports at most 2 decimal places.")
        BigDecimal maximumAmount,

        CompensationPeriod period) {

    /** Null-safe: an omitted compensation object resolves to "nothing said about pay". */
    public static Compensation toDomain(CompensationRequest request) {
        if (request == null) {
            return Compensation.of(null, null, null, null, null);
        }
        return Compensation.of(
                request.type(), request.currencyCode(), request.minimumAmount(), request.maximumAmount(),
                request.period());
    }
}
