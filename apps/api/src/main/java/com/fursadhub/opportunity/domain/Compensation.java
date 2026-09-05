package com.fursadhub.opportunity.domain;

import com.fursadhub.common.api.ApiException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.Currency;
import java.util.Locale;

/**
 * What an internship pays (Backend Phase B3) — structured, not a display string.
 *
 * <p>The whole point of modelling this rather than storing {@code "about $200 a month"} is that a
 * student can compare it, the listing can render it in English or Somali, and an unpaid internship
 * can say so unambiguously instead of leaving the field blank and ambiguous.
 *
 * <p><strong>The single amount lives in {@code minimumAmount}.</strong> {@code FIXED} sets
 * {@code minimumAmount} and leaves {@code maximumAmount} null, rather than storing the same number
 * twice — a duplicated pair invites the two copies to drift and forces every reader to check
 * whether they still agree. Read it as "the amount, and optionally an upper bound".
 *
 * <p>Absent compensation is represented by a null {@code Compensation}, not by a
 * {@code Compensation} full of nulls: an organization that has said nothing about pay is different
 * from one that has said the internship is unpaid, and the public profile must not conflate them.
 *
 * @param type          required; the discriminator every other field is validated against
 * @param currencyCode  ISO-4217, uppercase; required whenever an amount is present
 * @param minimumAmount the amount for {@code FIXED}, the lower bound for {@code RANGE}
 * @param maximumAmount the upper bound for {@code RANGE} only
 * @param period        the unit an amount is quoted in; required whenever an amount is present
 */
public record Compensation(
        CompensationType type,
        String currencyCode,
        BigDecimal minimumAmount,
        BigDecimal maximumAmount,
        CompensationPeriod period) {

    /** Matches {@code NUMERIC(12, 2)} in V43: up to 9,999,999,999.99. */
    public static final int AMOUNT_SCALE = 2;
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");

    /**
     * Normalises and validates one submitted compensation, or returns null when the organization
     * supplied nothing at all.
     *
     * <p>Every rule here is cross-field, which is exactly why it cannot live in Bean Validation
     * annotations on the request record: whether {@code maximumAmount} is required depends on
     * {@code type}, and whether {@code currencyCode} is required depends on whether an amount was
     * given.
     */
    public static Compensation of(
            CompensationType type, String currencyCode, BigDecimal minimumAmount, BigDecimal maximumAmount,
            CompensationPeriod period) {

        if (type == null) {
            // Nothing said about pay. Any stray amount is a malformed request, not a silent default:
            // dropping it would store a different offer than the one submitted.
            if (currencyCode != null || minimumAmount != null || maximumAmount != null || period != null) {
                throw invalid("A compensation type is required when any other compensation field is set.");
            }
            return null;
        }

        BigDecimal minimum = normalizeAmount(minimumAmount, "minimum");
        BigDecimal maximum = normalizeAmount(maximumAmount, "maximum");
        String currency = normalizeCurrency(currencyCode);

        return switch (type) {
            case UNPAID -> unpaid(currency, minimum, maximum, period);
            case FIXED -> fixed(currency, minimum, maximum, period);
            case RANGE -> range(currency, minimum, maximum, period);
            case NEGOTIABLE -> negotiable(currency, minimum, maximum, period);
        };
    }

    private static Compensation unpaid(
            String currency, BigDecimal minimum, BigDecimal maximum, CompensationPeriod period) {
        if (minimum != null || maximum != null || currency != null || period != null) {
            throw invalid("An unpaid internship must not carry an amount, currency or period.");
        }
        return new Compensation(CompensationType.UNPAID, null, null, null, null);
    }

    private static Compensation fixed(
            String currency, BigDecimal minimum, BigDecimal maximum, CompensationPeriod period) {
        if (minimum == null) {
            throw invalid("A fixed compensation requires an amount.");
        }
        if (maximum != null) {
            throw invalid("A fixed compensation must not carry a maximum amount; use RANGE instead.");
        }
        requireCurrencyAndPeriod(currency, period);
        return new Compensation(CompensationType.FIXED, currency, minimum, null, period);
    }

    private static Compensation range(
            String currency, BigDecimal minimum, BigDecimal maximum, CompensationPeriod period) {
        if (minimum == null || maximum == null) {
            throw invalid("A compensation range requires both a minimum and a maximum amount.");
        }
        if (minimum.compareTo(maximum) > 0) {
            throw invalid("The minimum compensation must not exceed the maximum.");
        }
        requireCurrencyAndPeriod(currency, period);
        return new Compensation(CompensationType.RANGE, currency, minimum, maximum, period);
    }

    /**
     * Negotiable may carry an indicative amount or none at all. If it carries one it is held to the
     * same rules as any other amount — a currency and a period, and a coherent order.
     */
    private static Compensation negotiable(
            String currency, BigDecimal minimum, BigDecimal maximum, CompensationPeriod period) {
        if (maximum != null && minimum == null) {
            throw invalid("A maximum compensation requires a minimum.");
        }
        if (minimum != null && maximum != null && minimum.compareTo(maximum) > 0) {
            throw invalid("The minimum compensation must not exceed the maximum.");
        }
        if (minimum == null) {
            if (currency != null || period != null) {
                throw invalid("A currency or period requires an amount.");
            }
            return new Compensation(CompensationType.NEGOTIABLE, null, null, null, null);
        }
        requireCurrencyAndPeriod(currency, period);
        return new Compensation(CompensationType.NEGOTIABLE, currency, minimum, maximum, period);
    }

    private static void requireCurrencyAndPeriod(String currency, CompensationPeriod period) {
        if (currency == null) {
            throw invalid("A currency is required when a compensation amount is set.");
        }
        if (period == null) {
            throw invalid("A compensation period is required when an amount is set.");
        }
    }

    /**
     * Rejects negatives and absurd magnitudes, and pins the scale to the column's.
     *
     * <p>{@code setScale} with {@link java.math.RoundingMode#UNNECESSARY} rather than rounding: a
     * request for {@code 200.005} is a mistake worth reporting, and quietly rounding a stated
     * amount would publish a figure the organization did not submit.
     */
    private static BigDecimal normalizeAmount(BigDecimal amount, String label) {
        if (amount == null) {
            return null;
        }
        if (amount.signum() < 0) {
            throw invalid("The " + label + " compensation amount must not be negative.");
        }
        if (amount.compareTo(MAX_AMOUNT) > 0) {
            throw invalid("The " + label + " compensation amount is too large.");
        }
        try {
            return amount.setScale(AMOUNT_SCALE, java.math.RoundingMode.UNNECESSARY);
        } catch (ArithmeticException tooPrecise) {
            throw invalid("A compensation amount supports at most " + AMOUNT_SCALE + " decimal places.");
        }
    }

    /**
     * Validates against the JDK's ISO-4217 table rather than an allowlist, so SOS, USD, EUR, KES and
     * every other real currency work without FursadHub maintaining a list — and a typo like
     * {@code "US"} or {@code "XYZ"} is still rejected.
     */
    private static String normalizeCurrency(String currencyCode) {
        if (currencyCode == null || currencyCode.isBlank()) {
            return null;
        }
        String normalized = currencyCode.strip().toUpperCase(Locale.ROOT);
        try {
            Currency.getInstance(normalized);
        } catch (IllegalArgumentException unknown) {
            throw invalid("Currency must be a valid three-letter ISO currency code.");
        }
        return normalized;
    }

    private static ApiException invalid(String message) {
        return new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, message);
    }
}
