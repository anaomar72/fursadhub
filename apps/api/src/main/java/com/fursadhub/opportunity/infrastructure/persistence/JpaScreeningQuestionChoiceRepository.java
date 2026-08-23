package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.ScreeningQuestionChoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaScreeningQuestionChoiceRepository extends JpaRepository<ScreeningQuestionChoice, UUID> {

    List<ScreeningQuestionChoice> findByQuestionIdOrderByPositionAsc(UUID questionId);

    List<ScreeningQuestionChoice> findByQuestionIdIn(List<UUID> questionIds);

    void deleteByQuestionId(UUID questionId);
}
