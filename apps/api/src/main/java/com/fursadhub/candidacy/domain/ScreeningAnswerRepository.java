package com.fursadhub.candidacy.domain;

import java.util.List;
import java.util.UUID;

public interface ScreeningAnswerRepository {

    ScreeningAnswer save(ScreeningAnswer answer);

    List<ScreeningAnswer> findByCandidacyId(UUID candidacyId);
}
