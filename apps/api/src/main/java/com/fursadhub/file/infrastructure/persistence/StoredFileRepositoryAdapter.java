package com.fursadhub.file.infrastructure.persistence;

import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.file.domain.StoredFileRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
class StoredFileRepositoryAdapter implements StoredFileRepository {

    private final JpaStoredFileRepository jpaRepository;

    StoredFileRepositoryAdapter(JpaStoredFileRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public StoredFile save(StoredFile file) {
        return jpaRepository.save(file);
    }

    @Override
    public Optional<StoredFile> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }
}
