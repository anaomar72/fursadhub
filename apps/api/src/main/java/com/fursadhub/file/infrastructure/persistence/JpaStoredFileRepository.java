package com.fursadhub.file.infrastructure.persistence;

import com.fursadhub.file.domain.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface JpaStoredFileRepository extends JpaRepository<StoredFile, UUID> {
}
