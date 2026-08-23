package com.fursadhub.candidacy.infrastructure.persistence;

import com.fursadhub.candidacy.domain.ScreeningAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaScreeningAnswerRepository extends JpaRepository<ScreeningAnswer, UUID> {

    List<ScreeningAnswer> findByCandidacyId(UUID candidacyId);
}
