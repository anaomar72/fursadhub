package com.fursadhub.verification.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.infrastructure.OpaqueTokenGenerator;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import com.fursadhub.verification.domain.StudentVerificationCase;
import com.fursadhub.verification.domain.StudentVerificationCaseRepository;
import com.fursadhub.verification.domain.VerificationChallenge;
import com.fursadhub.verification.domain.VerificationChallengeRepository;
import com.fursadhub.verification.infrastructure.ChallengeCodeGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/** Student-initiated short-lived account-binding challenge (CLAUDE.md section 29). */
@Service
public class IssueVerificationChallengeService {

    private static final Duration CHALLENGE_TTL = Duration.ofMinutes(5);

    private final StudentEnrollmentRepository enrollments;
    private final StudentVerificationCaseRepository cases;
    private final VerificationChallengeRepository challenges;
    private final ChallengeCodeGenerator codeGenerator;
    private final OpaqueTokenGenerator hasher;
    private final AuditService audit;

    public IssueVerificationChallengeService(
            StudentEnrollmentRepository enrollments,
            StudentVerificationCaseRepository cases,
            VerificationChallengeRepository challenges,
            ChallengeCodeGenerator codeGenerator,
            OpaqueTokenGenerator hasher,
            AuditService audit) {
        this.enrollments = enrollments;
        this.cases = cases;
        this.challenges = challenges;
        this.codeGenerator = codeGenerator;
        this.hasher = hasher;
        this.audit = audit;
    }

    public record IssuedChallenge(String code, Instant expiresAt) {
    }

    @Transactional
    public IssuedChallenge issue(UUID studentUserId, String ipAddress, String userAgent) {
        StudentEnrollment enrollment = enrollments.findByStudentUserId(studentUserId)
                .orElseThrow(() -> new ApiException("STUDENT_ENROLLMENT_NOT_FOUND", HttpStatus.NOT_FOUND, "No enrollment claimed yet."));
        StudentVerificationCase verificationCase = cases.findByEnrollmentId(enrollment.getId())
                .orElseThrow(() -> new ApiException("VERIFICATION_CASE_NOT_FOUND", HttpStatus.NOT_FOUND, "No verification case in progress."));

        if (!verificationCase.isReviewable()) {
            throw new ApiException("VERIFICATION_CASE_INVALID_TRANSITION", HttpStatus.CONFLICT, "A challenge can only be issued while your case is under review.");
        }

        String code = codeGenerator.generate();
        Instant expiresAt = Instant.now().plus(CHALLENGE_TTL);
        VerificationChallenge challenge = new VerificationChallenge(UUID.randomUUID(), verificationCase.getId(), hasher.hash(code), expiresAt);
        challenges.save(challenge);

        audit.record("VERIFICATION_CHALLENGE_ISSUED", studentUserId, ipAddress, userAgent, "caseId=" + verificationCase.getId());
        return new IssuedChallenge(code, expiresAt);
    }
}
