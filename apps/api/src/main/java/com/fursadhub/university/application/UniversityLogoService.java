package com.fursadhub.university.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.file.application.PrivateFileService;
import com.fursadhub.file.domain.FileClassification;
import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

/**
 * A university's own logo (Phase 8) — the exact counterpart of
 * {@link com.fursadhub.organization.application.OrganizationLogoService}. Upload is
 * {@code UNIVERSITY_ADMIN}-only; reading it back is public, no authentication required.
 */
@Service
public class UniversityLogoService {

    private final UniversityRepository universities;
    private final UniversityQueryService queryService;
    private final UniversityAuthorization authorization;
    private final PrivateFileService fileService;

    public UniversityLogoService(
            UniversityRepository universities, UniversityQueryService queryService,
            UniversityAuthorization authorization, PrivateFileService fileService) {
        this.universities = universities;
        this.queryService = queryService;
        this.authorization = authorization;
        this.fileService = fileService;
    }

    public record Document(StoredFile metadata, InputStream content) {
    }

    @Transactional
    public StoredFile upload(UUID actingUserId, UUID universityId, MultipartFile upload) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);

        University university = queryService.getUniversity(universityId);
        StoredFile stored = fileService.store(upload, FileClassification.UNIVERSITY_LOGO, actingUserId);
        UUID previous = university.getLogoStoredFileId();

        university.attachLogo(stored.getId());
        universities.save(university);

        fileService.deleteQuietly(previous);
        return stored;
    }

    /** Public — no authentication, no audit: a logo view is not a private-document access. */
    public Document openPublic(UUID universityId) {
        University university = queryService.getUniversity(universityId);
        if (university.getLogoStoredFileId() == null) {
            throw new ApiException("UNIVERSITY_LOGO_MISSING", HttpStatus.NOT_FOUND, "This university has no logo.");
        }
        StoredFile file = fileService.metadata(university.getLogoStoredFileId());
        return new Document(file, fileService.open(file));
    }
}
