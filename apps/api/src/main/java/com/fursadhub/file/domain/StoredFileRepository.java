package com.fursadhub.file.domain;

import java.util.Optional;
import java.util.UUID;

public interface StoredFileRepository {

    StoredFile save(StoredFile file);

    Optional<StoredFile> findById(UUID id);

    void deleteById(UUID id);
}
