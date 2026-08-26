package com.fursadhub.compliance.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PrivacyRequestRepository {

    PrivacyRequest save(PrivacyRequest request);

    Optional<PrivacyRequest> findById(UUID id);

    List<PrivacyRequest> findByUserIdOrderBySubmittedAtDesc(UUID userId);

    /** Admin queue. State is optional so one query serves both "open work" and "everything". */
    Page<PrivacyRequest> search(PrivacyRequestState state, Pageable pageable);

    long countByState(PrivacyRequestState state);
}
