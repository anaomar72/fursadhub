package com.fursadhub.university.application;

import com.fursadhub.common.audit.AuditService;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * University profile management and verification submission, restricted to {@code UNIVERSITY_ADMIN}
 * (CLAUDE.md sections 24, 25).
 *
 * <p>A coordinator or supervisor is deliberately excluded: they hold department- or placement-scoped
 * authority, and changing the tenant's own identity — or asking the platform to verify it — is a
 * whole-university act. Membership is re-read from PostgreSQL on every call rather than trusted from
 * a JWT claim.
 */
@Service
public class UpdateUniversityService {

    private final UniversityRepository universities;
    private final UniversityQueryService queryService;
    private final UniversityAuthorization authorization;
    private final AuditService audit;

    public UpdateUniversityService(
            UniversityRepository universities, UniversityQueryService queryService,
            UniversityAuthorization authorization, AuditService audit) {
        this.universities = universities;
        this.queryService = queryService;
        this.authorization = authorization;
        this.audit = audit;
    }

    @Transactional
    public University update(
            UUID actingUserId, UUID universityId, String name, String city, String registrationNumber,
            String website, String description, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);

        University university = queryService.getUniversity(universityId);
        university.updateProfile(name, city, registrationNumber, website, description);
        universities.save(university);

        audit.record("UNIVERSITY_PROFILE_UPDATED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId);

        return university;
    }

    /**
     * Enters the platform review queue. The domain object refuses this without attached evidence and
     * from any state other than DRAFT/NEEDS_CHANGES; this service never assigns the status itself.
     */
    @Transactional
    public University submitForVerification(UUID actingUserId, UUID universityId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);

        University university = queryService.getUniversity(universityId);
        university.submitForVerification();
        universities.save(university);

        audit.record("UNIVERSITY_VERIFICATION_SUBMITTED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId);

        return university;
    }
}
