package com.fursadhub.administration.application;

import com.fursadhub.administration.domain.PlatformStatistics;
import com.fursadhub.administration.domain.PlatformStatisticsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Platform operational statistics (Phase 7 "Admin: platform operational statistics").
 *
 * <p>SUPER_ADMIN only. The numbers are aggregates and identify nobody, but they still describe the
 * shape of the whole platform — how many accounts are suspended, how much mail is failing — which is
 * not something a verification officer needs in order to review one institution.
 */
@Service
public class PlatformStatisticsService {

    private final PlatformAuthorization authorization;
    private final PlatformStatisticsRepository statistics;

    public PlatformStatisticsService(PlatformAuthorization authorization, PlatformStatisticsRepository statistics) {
        this.authorization = authorization;
        this.statistics = statistics;
    }

    @Transactional(readOnly = true)
    public PlatformStatistics collect(UUID actingUserId) {
        authorization.requireSuperAdmin(actingUserId);
        return statistics.collect();
    }
}
