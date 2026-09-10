package com.fursadhub.candidacy.infrastructure.persistence;
import com.fursadhub.candidacy.domain.ApplicationCvUpload;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;
interface JpaApplicationCvUploadRepository extends JpaRepository<ApplicationCvUpload, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from ApplicationCvUpload u where u.id = :id")
    Optional<ApplicationCvUpload> findForUpdate(UUID id);
}
