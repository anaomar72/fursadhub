package com.fursadhub.compliance.infrastructure.persistence;

import com.fursadhub.compliance.domain.TermsAcceptance;
import com.fursadhub.compliance.domain.TermsAcceptanceRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
class TermsAcceptanceRepositoryAdapter implements TermsAcceptanceRepository {

    private final JpaTermsAcceptanceRepository jpaRepository;

    TermsAcceptanceRepositoryAdapter(JpaTermsAcceptanceRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    /**
     * Flushes deliberately, so that a concurrent duplicate acceptance trips
     * {@code UNIQUE(user_id, legal_document_id)} HERE rather than at commit — where it would escape
     * the calling service and surface as a 500 instead of a handled conflict.
     */
    @Override
    public TermsAcceptance save(TermsAcceptance acceptance) {
        return jpaRepository.saveAndFlush(acceptance);
    }

    @Override
    public List<TermsAcceptance> findByUserId(UUID userId) {
        return jpaRepository.findByUserId(userId);
    }

    @Override
    public boolean existsByUserIdAndLegalDocumentId(UUID userId, UUID legalDocumentId) {
        return jpaRepository.existsByUserIdAndLegalDocumentId(userId, legalDocumentId);
    }
}
