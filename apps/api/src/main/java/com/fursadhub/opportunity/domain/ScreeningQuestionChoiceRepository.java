package com.fursadhub.opportunity.domain;

import java.util.List;
import java.util.UUID;

public interface ScreeningQuestionChoiceRepository {

    ScreeningQuestionChoice save(ScreeningQuestionChoice choice);

    List<ScreeningQuestionChoice> findByQuestionIdOrderByPosition(UUID questionId);

    List<ScreeningQuestionChoice> findByQuestionIdIn(List<UUID> questionIds);

    void deleteByQuestionId(UUID questionId);
}
