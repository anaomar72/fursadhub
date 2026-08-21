package com.fursadhub.university.infrastructure.persistence;

import com.fursadhub.university.domain.UniversityMembership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaUniversityMembershipRepository extends JpaRepository<UniversityMembership, UUID> {

    Optional<UniversityMembership> findByUniversityIdAndUserIdAndRevokedAtIsNull(UUID universityId, UUID userId);

    boolean existsByUniversityIdAndUserIdAndRevokedAtIsNull(UUID universityId, UUID userId);

    List<UniversityMembership> findByUniversityId(UUID universityId);

    Optional<UniversityMembership> findFirstByUserIdAndRevokedAtIsNull(UUID userId);
}
