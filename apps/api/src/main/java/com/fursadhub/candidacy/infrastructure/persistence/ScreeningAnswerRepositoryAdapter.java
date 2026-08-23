package com.fursadhub.candidacy.infrastructure.persistence;

import com.fursadhub.candidacy.domain.ScreeningAnswer;
import com.fursadhub.candidacy.domain.ScreeningAnswerRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
class ScreeningAnswerRepositoryAdapter implements ScreeningAnswerRepository {

    private final JpaScreeningAnswerRepository jpaRepository;

    ScreeningAnswerRepositoryAdapter(JpaScreeningAnswerRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public ScreeningAnswer save(ScreeningAnswer answer) {
        return jpaRepository.save(answer);
    }

    @Override
    public List<ScreeningAnswer> findByCandidacyId(UUID candidacyId) {
        return jpaRepository.findByCandidacyId(candidacyId);
    }
}
