package com.fursadhub.administration.domain;

/** Read model for the admin dashboard's operational counts. Read-only by construction. */
public interface PlatformStatisticsRepository {

    PlatformStatistics collect();
}
