package com.fursadhub.compliance.domain;

import java.util.List;
import java.util.UUID;

public interface TermsAcceptanceRepository {

    TermsAcceptance save(TermsAcceptance acceptance);

    List<TermsAcceptance> findByUserId(UUID userId);

    boolean existsByUserIdAndLegalDocumentId(UUID userId, UUID legalDocumentId);
}
