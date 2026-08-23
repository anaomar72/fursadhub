package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.ScreeningQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaScreeningQuestionRepository extends JpaRepository<ScreeningQuestion, UUID> {

    List<ScreeningQuestion> findByOpportunityIdOrderByPositionAsc(UUID opportunityId);

    int countByOpportunityId(UUID opportunityId);
}
