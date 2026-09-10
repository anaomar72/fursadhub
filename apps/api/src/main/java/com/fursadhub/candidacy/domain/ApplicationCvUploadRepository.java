package com.fursadhub.candidacy.domain;
import java.util.Optional;
import java.util.UUID;
public interface ApplicationCvUploadRepository {
    ApplicationCvUpload save(ApplicationCvUpload upload);
    Optional<ApplicationCvUpload> findForUpdate(UUID id);
    void delete(ApplicationCvUpload upload);
}
