package com.fursadhub.compliance.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConsentRecordRepository {

    ConsentRecord save(ConsentRecord record);

    List<ConsentRecord> findByUserId(UUID userId);

    Optional<ConsentRecord> findByUserIdAndConsentType(UUID userId, ConsentType consentType);
}
