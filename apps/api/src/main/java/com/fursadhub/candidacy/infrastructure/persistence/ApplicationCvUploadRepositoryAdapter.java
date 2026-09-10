package com.fursadhub.candidacy.infrastructure.persistence;
import com.fursadhub.candidacy.domain.*;
import org.springframework.stereotype.Repository;
import java.util.*;
@Repository
class ApplicationCvUploadRepositoryAdapter implements ApplicationCvUploadRepository {
    private final JpaApplicationCvUploadRepository repository;
    ApplicationCvUploadRepositoryAdapter(JpaApplicationCvUploadRepository repository) { this.repository = repository; }
    public ApplicationCvUpload save(ApplicationCvUpload upload) { return repository.save(upload); }
    public Optional<ApplicationCvUpload> findForUpdate(UUID id) { return repository.findForUpdate(id); }
    public void delete(ApplicationCvUpload upload) { repository.delete(upload); }
}
