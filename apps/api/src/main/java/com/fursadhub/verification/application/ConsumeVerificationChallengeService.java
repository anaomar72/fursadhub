package com.fursadhub.verification.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.infrastructure.OpaqueTokenGenerator;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import com.fursadhub.university.application.UniversityAuthorization;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityRole;
import com.fursadhub.verification.domain.StudentVerificationCase;
import com.fursadhub.verification.domain.StudentVerificationCaseRepository;
import com.fursadhub.verification.domain.VerificationChallenge;
import com.fursadhub.verification.domain.VerificationChallengeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Staff-side consumption of a student's account-binding challenge (CLAUDE.md section 29). Only
 * staff with department scope over the enrollment's department may consume its challenge.
 */
@Service
public class ConsumeVerificationChallengeService {

    private final StudentVerificationCaseRepository cases;
    private final StudentEnrollmentRepository enrollments;
    private final VerificationChallengeRepository challenges;
    private final OpaqueTokenGenerator hasher;
    private final UniversityAuthorization universityAuthorization;
    private final AuditService audit;

    public ConsumeVerificationChallengeService(
            StudentVerificationCaseRepository cases,
            StudentEnrollmentRepository enrollments,
            VerificationChallengeRepository challenges,
            OpaqueTokenGenerator hasher,
            UniversityAuthorization universityAuthorization,
            AuditService audit) {
        this.cases = cases;
        this.enrollments = enrollments;
        this.challenges = challenges;
        this.hasher = hasher;
        this.universityAuthorization = universityAuthorization;
        this.audit = audit;
    }

    @Transactional
    public void consume(UUID staffUserId, UUID universityId, UUID caseId, String rawCode, String ipAddress, String userAgent) {
        StudentVerificationCase verificationCase = cases.findById(caseId)
                .orElseThrow(() -> new ApiException("VERIFICATION_CASE_NOT_FOUND", HttpStatus.NOT_FOUND, "Verification case not found."));
        StudentEnrollment enrollment = enrollments.findById(verificationCase.getEnrollmentId())
                .orElseThrow(() -> new IllegalStateException("Verification case references a missing enrollment"));

        if (!enrollment.getUniversityId().equals(universityId)) {
            throw accessDenied();
        }
        UniversityMembership membership = universityAuthorization.requireMembership(
                staffUserId, universityId, UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);
        universityAuthorization.requireDepartmentScope(membership, enrollment.getDepartmentId());

        String hash = hasher.hash(rawCode);
        VerificationChallenge challenge = challenges.findByVerificationCaseIdAndCodeHash(caseId, hash)
                .orElseThrow(this::invalidChallenge);

        if (challenge.isConsumed()) {
            throw invalidChallenge();
        }
        if (challenge.isExpired()) {
            throw new ApiException("VERIFICATION_CHALLENGE_EXPIRED", HttpStatus.BAD_REQUEST, "This challenge code has expired.");
        }

        challenge.consume();
        challenges.save(challenge);

        audit.record("VERIFICATION_CHALLENGE_CONSUMED", staffUserId, ipAddress, userAgent, "caseId=" + caseId);
    }

    private ApiException invalidChallenge() {
        return new ApiException("VERIFICATION_CHALLENGE_INVALID", HttpStatus.BAD_REQUEST, "This challenge code is invalid or has already been used.");
    }

    private ApiException accessDenied() {
        return new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "You do not have access to this resource.");
    }
}
