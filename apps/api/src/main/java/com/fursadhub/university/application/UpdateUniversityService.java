package com.fursadhub.university.application;

import com.fursadhub.common.api.ProfileText;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityProfileFields;
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

    /**
     * Replaces the university's editable profile.
     *
     * <p>Authorization is unchanged by Backend Phase B2: {@code UNIVERSITY_ADMIN} at THIS university
     * and nobody else — a department coordinator and a supervisor hold narrower scope, another
     * university's admin is refused by the membership lookup, and Super Admin verifies institutions
     * rather than authoring their profile copy.
     *
     * <p><strong>Two update semantics, resolved here</strong>, matching
     * {@code UpdateOrganizationService}: the five pre-B2 fields keep FULL REPLACEMENT — omitting one
     * clears it — while the two fields Backend Phase B2 added are preserved when omitted and cleared
     * only by an explicit null, so a client that predates them cannot erase them.
     */
    @Transactional
    public University update(
            UUID actingUserId, UUID universityId, UniversityProfileUpdate update,
            String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);

        University university = queryService.getUniversity(universityId);
        university.updateProfile(resolve(update, university));
        universities.save(university);

        // Identifier only — profile copy never enters audit metadata (CLAUDE.md section 68).
        audit.record("UNIVERSITY_PROFILE_UPDATED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId);

        return university;
    }

    /**
     * Turns the submitted request into the profile the university will hold: pre-B2 fields replaced
     * outright, B2 fields resolved against {@code current}, everything normalised.
     *
     * <p>Normalisation matches {@code UpdateOrganizationService} so the two institution profiles
     * cannot normalise differently. Description keeps its own line breaks; everything else collapses
     * internal runs of whitespace, and blank becomes null rather than an empty string.
     */
    private UniversityProfileFields resolve(UniversityProfileUpdate update, University current) {
        return new UniversityProfileFields(
                ProfileText.normalize(update.name()),
                ProfileText.normalize(update.city()),
                // Omitted => the stored value is copied through untouched, not re-normalised: a
                // field nobody mentioned must not be rewritten by an unrelated save.
                update.countryCode().resolve(current.getCountryCode(), ProfileText::normalizeCountryCode),
                ProfileText.normalize(update.registrationNumber()),
                ProfileText.normalize(update.website()),
                trimOrNull(update.description()),
                update.publicContactEmail().resolve(current.getPublicContactEmail(), ProfileText::normalize));
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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
