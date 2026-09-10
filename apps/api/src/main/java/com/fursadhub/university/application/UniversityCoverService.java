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
 * A university's public profile banner (Backend Phase B2) — the exact counterpart of
 * {@code OrganizationCoverService}, and shaped identically to {@link UniversityLogoService}:
 * {@code UNIVERSITY_ADMIN} to upload, no authentication to read, previous file deleted on replace,
 * bytes held through {@link PrivateFileService}.
 *
 * <p>Validation (permitted MIME types, size cap) belongs to
 * {@link FileClassification#UNIVERSITY_COVER} and is enforced inside {@code PrivateFileService}, so
 * this service cannot relax it.
 */
@Service
public class UniversityCoverService {

    private final UniversityRepository universities;
    private final UniversityQueryService queryService;
    private final UniversityAuthorization authorization;
    private final PrivateFileService fileService;

    public UniversityCoverService(
            UniversityRepository universities, UniversityQueryService queryService,
            UniversityAuthorization authorization, PrivateFileService fileService) {
        this.universities = universities;
        this.queryService = queryService;
        this.authorization = authorization;
        this.fileService = fileService;
    }

    public record Document(StoredFile metadata, InputStream content) {
    }

    /**
     * Uploads or replaces the banner.
     *
     * <p>{@code requireMembership} resolves the caller's CURRENT membership at THIS university, so a
     * coordinator, a supervisor, an admin of a different university and an unauthenticated caller
     * are all refused before a byte is read — tenant isolation comes from the membership lookup, not
     * from the id in the path (CLAUDE.md section 24).
     */
    @Transactional
    public StoredFile upload(UUID actingUserId, UUID universityId, MultipartFile upload) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);

        University university = queryService.getUniversity(universityId);
        StoredFile stored = fileService.store(upload, FileClassification.UNIVERSITY_COVER, actingUserId);
        UUID previous = university.getCoverStoredFileId();

        university.attachCover(stored.getId());
        universities.save(university);

        // Only after the new pointer is committed, so a failed delete can never orphan the profile.
        fileService.deleteQuietly(previous);
        return stored;
    }

    /** Public — no authentication, no audit: a banner view is not a private-document access. */
    public Document openPublic(UUID universityId) {
        University university = queryService.getUniversity(universityId);
        if (university.getCoverStoredFileId() == null) {
            throw new ApiException("UNIVERSITY_COVER_MISSING", HttpStatus.NOT_FOUND,
                    "This university has no cover image.");
        }
        StoredFile file = fileService.metadata(university.getCoverStoredFileId());
        return new Document(file, fileService.open(file));
    }
}
