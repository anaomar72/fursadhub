package com.fursadhub.student.application;

import com.fursadhub.candidacy.application.CandidacyAuthorization;
import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.file.application.PrivateFileService;
import com.fursadhub.file.domain.FileClassification;
import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.student.domain.StudentProfile;
import com.fursadhub.student.domain.StudentProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

/**
 * The student's CV: a private document on their own profile (CLAUDE.md sections 47-48).
 *
 * <p>Two readers, and only two:
 *
 * <ul>
 *   <li>the STUDENT, on their own profile;</li>
 *   <li>a RECRUITER at an organization where that student has an actual candidacy — reached through
 *       the candidacy, never through the student. A recruiter cannot ask for "student X's CV"; they
 *       can open the CV attached to a candidate in their own pipeline, and Phase 4's
 *       {@link CandidacyAuthorization} decides whether that candidacy is theirs.</li>
 * </ul>
 *
 * <p>That distinction is the whole security design. Routing the recruiter's read through the
 * candidacy means an organization sees a CV exactly when a student has chosen to apply or accepted a
 * nomination to them, and changing a UUID in the URL lands on a candidacy the recruiter's
 * organization does not own — which fails.
 *
 * <p>University staff are deliberately absent. A CV is the student's own document, and nothing in
 * the university's supervision role requires reading it.
 */
@Service
public class StudentCvService {

    private final StudentProfileRepository profiles;
    private final PrivateFileService fileService;
    private final CandidacyAuthorization candidacyAuthorization;

    public StudentCvService(
            StudentProfileRepository profiles,
            PrivateFileService fileService,
            CandidacyAuthorization candidacyAuthorization) {
        this.profiles = profiles;
        this.fileService = fileService;
        this.candidacyAuthorization = candidacyAuthorization;
    }

    /** A private document being streamed back to an authorized caller. */
    public record Document(StoredFile metadata, InputStream content) {
    }

    /**
     * Uploads or replaces the caller's own CV.
     *
     * <p>The profile is resolved from the authenticated user, never from a request parameter
     * (CLAUDE.md section 12), so there is no shape of this call that writes to another student's
     * profile.
     */
    @Transactional
    public StoredFile upload(UUID studentUserId, MultipartFile upload) {
        StudentProfile profile = requireProfile(studentUserId);

        StoredFile stored = fileService.store(upload, FileClassification.CV, studentUserId);
        UUID previous = profile.getCvStoredFileId();

        profile.attachCv(stored.getId());
        profiles.save(profile);

        // Best-effort, and only after the pointer has moved: a storage failure here must not roll
        // back an upload the student has already completed.
        fileService.deleteQuietly(previous);
        return stored;
    }

    /** Removes the CV. The student is entitled to withdraw their own document at any time. */
    @Transactional
    public void remove(UUID studentUserId) {
        StudentProfile profile = requireProfile(studentUserId);
        UUID previous = profile.getCvStoredFileId();
        if (previous == null) {
            return;
        }
        profile.attachCv(null);
        profiles.save(profile);
        fileService.deleteQuietly(previous);
    }

    @Transactional
    public Document openOwn(UUID studentUserId, String ipAddress, String userAgent) {
        return open(requireProfile(studentUserId), studentUserId, "own-profile", ipAddress, userAgent);
    }

    /**
     * A recruiter opening the CV of a candidate in their own pipeline.
     *
     * <p>Authorization is entirely Phase 4's: the candidacy must belong to an organization this
     * caller currently recruits for. Nothing here re-derives that, and nothing here can be reached
     * without it.
     */
    @Transactional
    public Document openForCandidacy(UUID actingUserId, UUID candidacyId, String ipAddress, String userAgent) {
        Candidacy candidacy = candidacyAuthorization.requireRecruiterAccess(actingUserId, candidacyId);
        StudentProfile profile = requireProfile(candidacy.getStudentUserId());
        return open(profile, actingUserId, "candidacyId=" + candidacyId, ipAddress, userAgent);
    }

    @Transactional(readOnly = true)
    public boolean hasCv(UUID studentUserId) {
        return profiles.findByUserId(studentUserId)
                .map(profile -> profile.getCvStoredFileId() != null)
                .orElse(false);
    }

    private Document open(StudentProfile profile, UUID actingUserId, String context, String ipAddress, String userAgent) {
        if (profile.getCvStoredFileId() == null) {
            throw new ApiException("CV_NOT_FOUND", HttpStatus.NOT_FOUND, "No CV has been uploaded.");
        }
        StoredFile file = fileService.metadata(profile.getCvStoredFileId());
        return new Document(file, fileService.openAudited(file, actingUserId, context, ipAddress, userAgent));
    }

    private StudentProfile requireProfile(UUID studentUserId) {
        return profiles.findByUserId(studentUserId)
                .orElseThrow(() -> new ApiException("STUDENT_PROFILE_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "Complete your student profile first."));
    }
}
