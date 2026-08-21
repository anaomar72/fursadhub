package com.fursadhub.university.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UniversityRepository {

    Optional<University> findById(UUID id);

    List<University> findAll();
}
