package com.fursadhub.internshipmanagement.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Week-number arithmetic (Phase 6 section 25).
 *
 * <p>These are pure {@link LocalDate} calculations with no clock and no zone, so they cannot develop
 * a timezone-sensitive bug — which is exactly why they are worth pinning down explicitly.
 */
class WeeklyLogPeriodsTest {

    @Test
    void anExactNumberOfWeeksCountsExactly() {
        // 2 March to 29 March inclusive is 28 days — four whole weeks.
        WeeklyLogPeriods periods = new WeeklyLogPeriods(LocalDate.of(2026, 3, 2), LocalDate.of(2026, 3, 29));

        assertThat(periods.expectedWeekCount()).isEqualTo(4);
    }

    @Test
    void aPartialFinalWeekStillCountsAsAWeek() {
        // 30 days: four full weeks plus two days the student still served.
        WeeklyLogPeriods periods = new WeeklyLogPeriods(LocalDate.of(2026, 3, 2), LocalDate.of(2026, 3, 31));

        assertThat(periods.expectedWeekCount()).isEqualTo(5);
    }

    @Test
    void aSingleDayPlacementHasOneWeek() {
        WeeklyLogPeriods periods = new WeeklyLogPeriods(LocalDate.of(2026, 3, 2), LocalDate.of(2026, 3, 2));

        assertThat(periods.expectedWeekCount()).isEqualTo(1);
    }

    @Test
    void weekOneStartsOnThePlacementStartDate() {
        WeeklyLogPeriods periods = new WeeklyLogPeriods(LocalDate.of(2026, 3, 2), LocalDate.of(2026, 5, 31));

        WeeklyLogPeriods.Period week1 = periods.periodFor(1);

        assertThat(week1.start()).isEqualTo(LocalDate.of(2026, 3, 2));
        assertThat(week1.end()).isEqualTo(LocalDate.of(2026, 3, 8));
    }

    @Test
    void laterWeeksFollowSevenDaysApart() {
        WeeklyLogPeriods periods = new WeeklyLogPeriods(LocalDate.of(2026, 3, 2), LocalDate.of(2026, 5, 31));

        WeeklyLogPeriods.Period week3 = periods.periodFor(3);

        assertThat(week3.start()).isEqualTo(LocalDate.of(2026, 3, 16));
        assertThat(week3.end()).isEqualTo(LocalDate.of(2026, 3, 22));
    }

    @Test
    void theFinalWeekIsClampedToThePlacementEndDate() {
        // 30 days, so week 5 covers only 30-31 March rather than running past the internship.
        WeeklyLogPeriods periods = new WeeklyLogPeriods(LocalDate.of(2026, 3, 2), LocalDate.of(2026, 3, 31));

        WeeklyLogPeriods.Period lastWeek = periods.periodFor(5);

        assertThat(lastWeek.start()).isEqualTo(LocalDate.of(2026, 3, 30));
        assertThat(lastWeek.end()).isEqualTo(LocalDate.of(2026, 3, 31));
    }

    @Test
    void weekNumbersOutsideThePlacementAreRejected() {
        WeeklyLogPeriods periods = new WeeklyLogPeriods(LocalDate.of(2026, 3, 2), LocalDate.of(2026, 3, 29));

        assertThatThrownBy(() -> periods.requireValidWeek(0))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "WEEKLY_LOG_WEEK_OUT_OF_RANGE");
        assertThatThrownBy(() -> periods.requireValidWeek(5))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> periods.requireValidWeek(900))
                .isInstanceOf(ApiException.class);
    }
}
