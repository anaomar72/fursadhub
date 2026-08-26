package com.fursadhub.compliance.infrastructure.persistence;

import com.fursadhub.compliance.domain.ConsentRecord;
import com.fursadhub.compliance.domain.ConsentRecordRepository;
import com.fursadhub.compliance.domain.ConsentType;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class ConsentRecordRepositoryAdapter implements ConsentRecordRepository {

    private final JpaConsentRecordRepository jpaRepository;

    ConsentRecordRepositoryAdapter(JpaConsentRecordRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public ConsentRecord save(ConsentRecord record) {
        return jpaRepository.save(record);
    }

    @Override
    public List<ConsentRecord> findByUserId(UUID userId) {
        return jpaRepository.findByUserId(userId);
    }

    @Override
    public Optional<ConsentRecord> findByUserIdAndConsentType(UUID userId, ConsentType consentType) {
        return jpaRepository.findByUserIdAndConsentType(userId, consentType);
    }
}
