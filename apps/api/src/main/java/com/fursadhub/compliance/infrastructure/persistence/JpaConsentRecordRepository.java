package com.fursadhub.compliance.infrastructure.persistence;

import com.fursadhub.compliance.domain.ConsentRecord;
import com.fursadhub.compliance.domain.ConsentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaConsentRecordRepository extends JpaRepository<ConsentRecord, UUID> {

    List<ConsentRecord> findByUserId(UUID userId);

    Optional<ConsentRecord> findByUserIdAndConsentType(UUID userId, ConsentType consentType);
}
