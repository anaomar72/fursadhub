package com.fursadhub.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * A single injectable clock so date-sensitive business rules — application deadlines, nomination
 * deadlines, offer response deadlines — are deterministically testable instead of reaching for
 * {@code LocalDate.now()} inline.
 *
 * <p>UTC, matching CLAUDE.md section 53: event timestamps are stored in UTC, and date-only business
 * concepts are evaluated against one consistent zone rather than the host's local zone.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
