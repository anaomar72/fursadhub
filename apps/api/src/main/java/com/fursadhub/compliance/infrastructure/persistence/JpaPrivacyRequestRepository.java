package com.fursadhub.compliance.infrastructure.persistence;

import com.fursadhub.compliance.domain.PrivacyRequest;
import com.fursadhub.compliance.domain.PrivacyRequestState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

interface JpaPrivacyRequestRepository extends JpaRepository<PrivacyRequest, UUID> {

    List<PrivacyRequest> findByUserIdOrderBySubmittedAtDesc(UUID userId);

    long countByState(PrivacyRequestState state);

    @Query("""
            SELECT r FROM PrivacyRequest r
            WHERE (:state IS NULL OR r.state = :state)
            ORDER BY r.submittedAt ASC
            """)
    Page<PrivacyRequest> search(@Param("state") PrivacyRequestState state, Pageable pageable);
}
