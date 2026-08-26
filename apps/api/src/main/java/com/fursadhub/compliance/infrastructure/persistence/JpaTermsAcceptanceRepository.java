package com.fursadhub.compliance.infrastructure.persistence;

import com.fursadhub.compliance.domain.TermsAcceptance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaTermsAcceptanceRepository extends JpaRepository<TermsAcceptance, UUID> {

    List<TermsAcceptance> findByUserId(UUID userId);

    boolean existsByUserIdAndLegalDocumentId(UUID userId, UUID legalDocumentId);
}
