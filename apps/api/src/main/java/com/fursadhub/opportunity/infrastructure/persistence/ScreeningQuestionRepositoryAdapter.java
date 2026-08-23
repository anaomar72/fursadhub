package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.ScreeningQuestion;
import com.fursadhub.opportunity.domain.ScreeningQuestionRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class ScreeningQuestionRepositoryAdapter implements ScreeningQuestionRepository {

    private final JpaScreeningQuestionRepository jpaRepository;

    ScreeningQuestionRepositoryAdapter(JpaScreeningQuestionRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public ScreeningQuestion save(ScreeningQuestion question) {
        return jpaRepository.save(question);
    }

    @Override
    public Optional<ScreeningQuestion> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<ScreeningQuestion> findByOpportunityIdOrderByPosition(UUID opportunityId) {
        return jpaRepository.findByOpportunityIdOrderByPositionAsc(opportunityId);
    }

    @Override
    public int countByOpportunityId(UUID opportunityId) {
        return jpaRepository.countByOpportunityId(opportunityId);
    }

    @Override
    public void delete(ScreeningQuestion question) {
        jpaRepository.delete(question);
    }
}
