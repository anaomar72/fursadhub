package com.fursadhub.internshipmanagement.domain;

import com.fursadhub.common.api.ApiException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Deterministic mapping between a placement's dates and its week numbers (Phase 6 section 25).
 *
 * <p>Week 1 begins on the placement's start date and runs seven days; week N begins
 * {@code 7 * (N - 1)} days later. Nothing here consults a calendar week, a locale, a time zone or
 * {@code Instant.now()}, so the same placement always yields the same weeks no matter where or when
 * it is computed. The internship period is a business date range, so it is expressed purely in
 * {@link LocalDate} (CLAUDE.md section 53).
 *
 * <p>The final week is clamped to the placement's end date rather than running past it, so a
 * placement ending mid-week does not report a period that extends beyond the internship.
 */
public final class WeeklyLogPeriods {

    private static final int DAYS_PER_WEEK = 7;

    private final LocalDate startDate;
    private final LocalDate endDate;

    public WeeklyLogPeriods(LocalDate startDate, LocalDate endDate) {
        this.startDate = startDate;
        this.endDate = endDate;
    }

    /**
     * How many weekly logs this placement is expected to have.
     *
     * <p>This is derived from the placement's own dates, NOT from a configured number: FursadHub has
     * no frozen source of truth for "how many logs an internship needs", and inventing one would be
     * inventing a university regulation. A partial final week still counts as a week the student
     * served, so the day count is rounded up.
     */
    public int expectedWeekCount() {
        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        long weeks = (days + DAYS_PER_WEEK - 1) / DAYS_PER_WEEK;
        return (int) Math.max(1, weeks);
    }

    /** The inclusive date range covered by one week number. */
    public Period periodFor(int weekNumber) {
        requireValidWeek(weekNumber);
        LocalDate periodStart = startDate.plusDays((long) (weekNumber - 1) * DAYS_PER_WEEK);
        LocalDate uncappedEnd = periodStart.plusDays(DAYS_PER_WEEK - 1L);
        LocalDate periodEnd = uncappedEnd.isAfter(endDate) ? endDate : uncappedEnd;
        return new Period(periodStart, periodEnd);
    }

    /**
     * Rejects a week number outside the placement. Without this a student could file "week 900" of a
     * three-month internship, which the completion check would then never be able to reconcile.
     */
    public void requireValidWeek(int weekNumber) {
        if (weekNumber < 1 || weekNumber > expectedWeekCount()) {
            throw new ApiException("WEEKLY_LOG_WEEK_OUT_OF_RANGE", HttpStatus.BAD_REQUEST,
                    "That week number is outside this internship period.");
        }
    }

    public record Period(LocalDate start, LocalDate end) {
    }
}
