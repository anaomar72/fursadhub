package com.fursadhub.university.application;

import com.fursadhub.administration.application.PlatformAuthorization;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
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
 * The private registration/accreditation document a university attaches before it may submit itself
 * for verification (CLAUDE.md sections 31, 47-48).
 *
 * <p>"Verification evidence must remain private", so the reader list is short and closed:
 *
 * <ul>
 *   <li>a {@code UNIVERSITY_ADMIN} of THAT university may upload or replace it;</li>
 *   <li>any active staff member of THAT university may read it back;</li>
 *   <li>a platform {@code VERIFICATION_OFFICER}/{@code SUPER_ADMIN} may read it, because they are the
 *       ones who decide on it.</li>
 * </ul>
 *
 * <p>Nobody else has a route. Every check is against the university id in the path AND the caller's
 * current PostgreSQL membership, so swapping the id in the URL fails rather than reaching another
 * tenant's document — the same isolation boundary CLAUDE.md section 26 makes mandatory for
 * organizations.
 *
 * <p>The document is never public: random storage key, no URL ever issued, and every read goes
 * through {@link PrivateFileService#openAudited} so it lands in the audit trail.
 */
@Service
public class UniversityVerificationEvidenceService {

    private final UniversityRepository universities;
    private final UniversityQueryService queryService;
    private final PrivateFileService fileService;
    private final UniversityAuthorization universityAuthorization;
    private final PlatformAuthorization platformAuthorization;
    private final AuditService audit;

    public UniversityVerificationEvidenceService(
            UniversityRepository universities,
            UniversityQueryService queryService,
            PrivateFileService fileService,
            UniversityAuthorization universityAuthorization,
            PlatformAuthorization platformAuthorization,
            AuditService audit) {
        this.universities = universities;
        this.queryService = queryService;
        this.fileService = fileService;
        this.universityAuthorization = universityAuthorization;
        this.platformAuthorization = platformAuthorization;
        this.audit = audit;
    }

    /** A private document being streamed back to an authorized caller. */
    public record Document(StoredFile metadata, InputStream content) {
    }

    /** Uploads or replaces the license document. {@code UNIVERSITY_ADMIN} of this university only. */
    @Transactional
    public StoredFile upload(UUID actingUserId, UUID universityId, MultipartFile upload, String ipAddress, String userAgent) {
        universityAuthorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);

        University university = queryService.getUniversity(universityId);
        StoredFile stored = fileService.store(upload, FileClassification.UNIVERSITY_VERIFICATION_EVIDENCE, actingUserId);
        UUID previous = university.getEvidenceStoredFileId();

        university.attachEvidence(stored.getId());
        universities.save(university);

        audit.record("UNIVERSITY_VERIFICATION_EVIDENCE_UPLOADED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";storedFileId=" + stored.getId());

        // Best-effort, after the pointer has moved: a storage hiccup here must not roll back an
        // upload the university has already completed. The worst case is one orphaned object.
        fileService.deleteQuietly(previous);
        return stored;
    }

    /**
     * A staff member of the university reading back their own institution's document.
     *
     * <p>Any active role is enough here — unlike upload, which is admin-only. Reading the document
     * the university itself supplied leaks nothing to its own staff, and a coordinator chasing a
     * stalled verification should not have to ask an admin to show it to them.
     */
    @Transactional
    public Document openOwn(UUID actingUserId, UUID universityId, String ipAddress, String userAgent) {
        universityAuthorization.requireMembership(actingUserId, universityId);
        return open(queryService.getUniversity(universityId), actingUserId, ipAddress, userAgent);
    }

    /** A platform reviewer reading the evidence on a university they are deciding on. */
    @Transactional
    public Document openForPlatformReviewer(UUID actingUserId, UUID universityId, String ipAddress, String userAgent) {
        platformAuthorization.requireReviewer(actingUserId);
        return open(queryService.getUniversity(universityId), actingUserId, ipAddress, userAgent);
    }

    // ---------------------------------------------------------------- internals

    private Document open(University university, UUID actingUserId, String ipAddress, String userAgent) {
        if (university.getEvidenceStoredFileId() == null) {
            throw new ApiException("UNIVERSITY_VERIFICATION_EVIDENCE_MISSING", HttpStatus.NOT_FOUND,
                    "No registration document has been uploaded for this university.");
        }
        StoredFile file = fileService.metadata(university.getEvidenceStoredFileId());
        return new Document(file, fileService.openAudited(
                file, actingUserId, "universityId=" + university.getId(), ipAddress, userAgent));
    }
}
