package com.fursadhub.university.application;

import com.fursadhub.common.audit.AuditService;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Self-service university registration (CLAUDE.md section 25).
 *
 * <p>Mirrors organization registration exactly: the registering user becomes the founding
 * {@code UNIVERSITY_ADMIN}, and the university starts {@code DRAFT}-verified. Until a platform
 * reviewer verifies it, no organization can target it with an opportunity
 * ({@code TARGET_UNIVERSITY_NOT_VERIFIED}), so registering here grants a tenant to administer, not
 * a place in the recruitment pipeline.
 *
 * <p>The founding membership is written in the SAME transaction as the university. A university with
 * no administrator would be unreachable by anyone except a platform admin, so the two rows must
 * commit or fail together.
 */
@Service
public class CreateUniversityService {

    private final UniversityRepository universities;
    private final UniversityMembershipRepository memberships;
    private final AuditService audit;

    public CreateUniversityService(
            UniversityRepository universities, UniversityMembershipRepository memberships, AuditService audit) {
        this.universities = universities;
        this.memberships = memberships;
        this.audit = audit;
    }

    @Transactional
    public University create(
            UUID actingUserId, String name, String city, String registrationNumber, String website,
            String description, String ipAddress, String userAgent) {
        String base = UniversitySlugGenerator.base(name);
        String slug = universities.existsBySlug(base) ? UniversitySlugGenerator.withSuffix(base) : base;

        University university = University.register(name, slug, city, registrationNumber, website, description);
        universities.save(university);

        UniversityMembership membership =
                UniversityMembership.assign(university.getId(), actingUserId, UniversityRole.UNIVERSITY_ADMIN);
        memberships.save(membership);

        audit.record("UNIVERSITY_CREATED", actingUserId, ipAddress, userAgent,
                "universityId=" + university.getId());

        return university;
    }
}
