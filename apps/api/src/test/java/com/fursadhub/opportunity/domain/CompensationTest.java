package com.fursadhub.opportunity.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/**
 * The compensation rules (Backend Phase B3). Every case here is cross-field — which is exactly why
 * these rules live in the domain rather than in Bean Validation annotations.
 */
class CompensationTest {

    private static final BigDecimal TWO_HUNDRED = new BigDecimal("200.00");
    private static final BigDecimal FIVE_HUNDRED = new BigDecimal("500.00");

    // ---------------------------------------------------------------- valid shapes

    @Test
    void unpaidCarriesNoAmounts() {
        Compensation compensation = Compensation.of(CompensationType.UNPAID, null, null, null, null);

        assertThat(compensation.type()).isEqualTo(CompensationType.UNPAID);
        assertThat(compensation.minimumAmount()).isNull();
        assertThat(compensation.maximumAmount()).isNull();
        assertThat(compensation.currencyCode()).isNull();
        assertThat(compensation.period()).isNull();
    }

    /** The single amount lives in minimumAmount; maximum stays null rather than duplicating it. */
    @Test
    void fixedCarriesOneAmountInMinimum() {
        Compensation compensation = Compensation.of(
                CompensationType.FIXED, "USD", TWO_HUNDRED, null, CompensationPeriod.MONTH);

        assertThat(compensation.minimumAmount()).isEqualByComparingTo(TWO_HUNDRED);
        assertThat(compensation.maximumAmount()).isNull();
        assertThat(compensation.period()).isEqualTo(CompensationPeriod.MONTH);
    }

    @Test
    void rangeCarriesBothBounds() {
        Compensation compensation = Compensation.of(
                CompensationType.RANGE, "SOS", TWO_HUNDRED, FIVE_HUNDRED, CompensationPeriod.MONTH);

        assertThat(compensation.minimumAmount()).isEqualByComparingTo(TWO_HUNDRED);
        assertThat(compensation.maximumAmount()).isEqualByComparingTo(FIVE_HUNDRED);
    }

    /** Equal bounds are a legitimate range, not a disguised FIXED — min <= max, not min < max. */
    @Test
    void rangeAllowsEqualBounds() {
        assertThat(Compensation.of(CompensationType.RANGE, "USD", TWO_HUNDRED, TWO_HUNDRED, CompensationPeriod.WEEK))
                .isNotNull();
    }

    @Test
    void negotiableMayOmitAnyAmount() {
        Compensation compensation = Compensation.of(CompensationType.NEGOTIABLE, null, null, null, null);

        assertThat(compensation.type()).isEqualTo(CompensationType.NEGOTIABLE);
        assertThat(compensation.minimumAmount()).isNull();
    }

    @Test
    void negotiableMayCarryAnIndicativeAmount() {
        Compensation compensation = Compensation.of(
                CompensationType.NEGOTIABLE, "KES", TWO_HUNDRED, null, CompensationPeriod.TOTAL);

        assertThat(compensation.minimumAmount()).isEqualByComparingTo(TWO_HUNDRED);
    }

    /**
     * Nothing said about pay is null, NOT an empty Compensation — an organization that has said
     * nothing is different from one that has said the internship is unpaid.
     */
    @Test
    void nothingSuppliedIsNullRatherThanAnEmptyCompensation() {
        assertThat(Compensation.of(null, null, null, null, null)).isNull();
    }

    // ---------------------------------------------------------------- rejected combinations

    @Test
    void unpaidRejectsAnAmount() {
        assertThatThrownBy(() -> Compensation.of(
                CompensationType.UNPAID, "USD", TWO_HUNDRED, null, CompensationPeriod.MONTH))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void fixedRequiresAnAmount() {
        assertThatThrownBy(() -> Compensation.of(CompensationType.FIXED, "USD", null, null, CompensationPeriod.MONTH))
                .isInstanceOf(ApiException.class);
    }

    /** FIXED must not smuggle in a range; that is what RANGE is for. */
    @Test
    void fixedRejectsAMaximum() {
        assertThatThrownBy(() -> Compensation.of(
                CompensationType.FIXED, "USD", TWO_HUNDRED, FIVE_HUNDRED, CompensationPeriod.MONTH))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void rangeRequiresBothBounds() {
        assertThatThrownBy(() -> Compensation.of(CompensationType.RANGE, "USD", TWO_HUNDRED, null, CompensationPeriod.MONTH))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> Compensation.of(CompensationType.RANGE, "USD", null, FIVE_HUNDRED, CompensationPeriod.MONTH))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void rangeRejectsMinimumGreaterThanMaximum() {
        ApiException failure = catchThrowableOfType(
                () -> Compensation.of(CompensationType.RANGE, "USD", FIVE_HUNDRED, TWO_HUNDRED, CompensationPeriod.MONTH),
                ApiException.class);

        assertThat(failure.getCode()).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void negativeAmountsAreRejected() {
        assertThatThrownBy(() -> Compensation.of(
                CompensationType.FIXED, "USD", new BigDecimal("-1.00"), null, CompensationPeriod.MONTH))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void anAmountRequiresACurrencyAndAPeriod() {
        assertThatThrownBy(() -> Compensation.of(CompensationType.FIXED, null, TWO_HUNDRED, null, CompensationPeriod.MONTH))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> Compensation.of(CompensationType.FIXED, "USD", TWO_HUNDRED, null, null))
                .isInstanceOf(ApiException.class);
    }

    /** A stray amount with no type is a malformed request, not a silent default. */
    @Test
    void amountsWithoutATypeAreRejected() {
        assertThatThrownBy(() -> Compensation.of(null, "USD", TWO_HUNDRED, null, CompensationPeriod.MONTH))
                .isInstanceOf(ApiException.class);
    }

    // ---------------------------------------------------------------- currency

    /** Validated against the JDK's ISO-4217 table, so no currency list is hardcoded. */
    @ParameterizedTest
    @ValueSource(strings = {"USD", "SOS", "EUR", "KES", "GBP", "ETB", "AED"})
    void realIsoCurrenciesAreAccepted(String currency) {
        assertThat(Compensation.of(CompensationType.FIXED, currency, TWO_HUNDRED, null, CompensationPeriod.MONTH)
                .currencyCode()).isEqualTo(currency);
    }

    @ParameterizedTest
    @ValueSource(strings = {"XYZ", "US", "DOLLAR", "12A", "$$$"})
    void unknownOrMalformedCurrenciesAreRejected(String currency) {
        assertThatThrownBy(() -> Compensation.of(
                CompensationType.FIXED, currency, TWO_HUNDRED, null, CompensationPeriod.MONTH))
                .as("%s must be rejected", currency)
                .isInstanceOf(ApiException.class);
    }

    @Test
    void currencyIsUpperCased() {
        assertThat(Compensation.of(CompensationType.FIXED, "usd", TWO_HUNDRED, null, CompensationPeriod.MONTH)
                .currencyCode()).isEqualTo("USD");
    }

    // ---------------------------------------------------------------- amount precision

    /** Scale is pinned to the column's, so what is validated is what is stored. */
    @Test
    void amountsAreNormalizedToTwoDecimalPlaces() {
        assertThat(Compensation.of(CompensationType.FIXED, "USD", new BigDecimal("200"), null, CompensationPeriod.MONTH)
                .minimumAmount().scale()).isEqualTo(2);
    }

    /**
     * Over-precise input is reported rather than silently rounded: publishing 200.00 when the
     * organization submitted 200.005 would state a figure they never gave.
     */
    @Test
    void overPreciseAmountsAreRejectedRatherThanRounded() {
        assertThatThrownBy(() -> Compensation.of(
                CompensationType.FIXED, "USD", new BigDecimal("200.005"), null, CompensationPeriod.MONTH))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void absurdlyLargeAmountsAreRejected() {
        assertThatThrownBy(() -> Compensation.of(
                CompensationType.FIXED, "USD", new BigDecimal("99999999999.00"), null, CompensationPeriod.MONTH))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void zeroIsAValidFixedAmount() {
        assertThat(Compensation.of(CompensationType.FIXED, "USD", BigDecimal.ZERO, null, CompensationPeriod.MONTH)
                .minimumAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}
