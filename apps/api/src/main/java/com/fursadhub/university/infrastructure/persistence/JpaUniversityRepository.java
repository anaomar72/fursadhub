package com.fursadhub.university.infrastructure.persistence;

import com.fursadhub.university.domain.University;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface JpaUniversityRepository extends JpaRepository<University, UUID> {
}
