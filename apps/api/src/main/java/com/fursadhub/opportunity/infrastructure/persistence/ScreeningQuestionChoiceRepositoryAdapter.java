package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.ScreeningQuestionChoice;
import com.fursadhub.opportunity.domain.ScreeningQuestionChoiceRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
class ScreeningQuestionChoiceRepositoryAdapter implements ScreeningQuestionChoiceRepository {

    private final JpaScreeningQuestionChoiceRepository jpaRepository;

    ScreeningQuestionChoiceRepositoryAdapter(JpaScreeningQuestionChoiceRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public ScreeningQuestionChoice save(ScreeningQuestionChoice choice) {
        return jpaRepository.save(choice);
    }

    @Override
    public List<ScreeningQuestionChoice> findByQuestionIdOrderByPosition(UUID questionId) {
        return jpaRepository.findByQuestionIdOrderByPositionAsc(questionId);
    }

    @Override
    public List<ScreeningQuestionChoice> findByQuestionIdIn(List<UUID> questionIds) {
        return questionIds.isEmpty() ? List.of() : jpaRepository.findByQuestionIdIn(questionIds);
    }

    @Override
    @Transactional
    public void deleteByQuestionId(UUID questionId) {
        jpaRepository.deleteByQuestionId(questionId);
    }
}
