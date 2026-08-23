package com.fursadhub.opportunity.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScreeningQuestionRepository {

    ScreeningQuestion save(ScreeningQuestion question);

    Optional<ScreeningQuestion> findById(UUID id);

    List<ScreeningQuestion> findByOpportunityIdOrderByPosition(UUID opportunityId);

    int countByOpportunityId(UUID opportunityId);

    void delete(ScreeningQuestion question);
}
