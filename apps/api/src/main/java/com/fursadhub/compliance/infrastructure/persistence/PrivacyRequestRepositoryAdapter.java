package com.fursadhub.compliance.infrastructure.persistence;

import com.fursadhub.compliance.domain.PrivacyRequest;
import com.fursadhub.compliance.domain.PrivacyRequestRepository;
import com.fursadhub.compliance.domain.PrivacyRequestState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class PrivacyRequestRepositoryAdapter implements PrivacyRequestRepository {

    private final JpaPrivacyRequestRepository jpaRepository;

    PrivacyRequestRepositoryAdapter(JpaPrivacyRequestRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public PrivacyRequest save(PrivacyRequest request) {
        return jpaRepository.save(request);
    }

    @Override
    public Optional<PrivacyRequest> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<PrivacyRequest> findByUserIdOrderBySubmittedAtDesc(UUID userId) {
        return jpaRepository.findByUserIdOrderBySubmittedAtDesc(userId);
    }

    @Override
    public Page<PrivacyRequest> search(PrivacyRequestState state, Pageable pageable) {
        return jpaRepository.search(state, pageable);
    }

    @Override
    public long countByState(PrivacyRequestState state) {
        return jpaRepository.countByState(state);
    }
}
