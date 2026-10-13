package com.fursadhub.administration.domain;

import java.util.UUID;

/** Loads the {@link PlatformAccessSnapshot} the effective-access policy resolves (Phase C1). */
public interface PlatformAccessRepository {

    /** Never null: a missing account yields a snapshot with a {@code null} status and no grants. */
    PlatformAccessSnapshot load(UUID userId);
}
