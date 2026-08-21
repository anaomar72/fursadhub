package com.fursadhub.university.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UniversityMembershipRepository {

    UniversityMembership save(UniversityMembership membership);

    Optional<UniversityMembership> findById(UUID id);

    Optional<UniversityMembership> findActiveByUniversityIdAndUserId(UUID universityId, UUID userId);

    /** A staff member holds one active membership at a time for the pilot (single-university staff). */
    Optional<UniversityMembership> findActiveByUserId(UUID userId);

    List<UniversityMembership> findByUniversityId(UUID universityId);

    boolean existsActiveByUniversityIdAndUserId(UUID universityId, UUID userId);
}
