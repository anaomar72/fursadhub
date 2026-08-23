package com.fursadhub.candidacy.application;

import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.candidacy.domain.CandidacyRepository;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.organization.application.OrganizationAuthorization;
import com.fursadhub.organization.domain.OrganizationRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Dedicated resource-scoped authorization for candidacies and offers (CLAUDE.md section 24).
 *
 * <p>Access is never granted from a role string. Every organization-side check walks the real chain
 *
 * <pre>candidacy -&gt; opportunity's organization -&gt; current active membership</pre>
 *
 * re-read from PostgreSQL, so a recruiter at Organization A cannot reach Organization B's
 * candidates by changing an id in the URL.
 *
 * <p>{@code ORGANIZATION_SUPERVISOR} is deliberately excluded from the candidate pool: supervising
 * an ongoing placement does not imply access to recruitment data (Phase 4 section 11).
 */
@Component
public class CandidacyAuthorization {

    private static final OrganizationRole[] RECRUITING_ROLES = {
            OrganizationRole.ORGANIZATION_ADMIN, OrganizationRole.RECRUITER
    };

    private final CandidacyRepository candidacies;
    private final OrganizationAuthorization organizationAuthorization;

    public CandidacyAuthorization(CandidacyRepository candidacies, OrganizationAuthorization organizationAuthorization) {
        this.candidacies = candidacies;
        this.organizationAuthorization = organizationAuthorization;
    }

    /** Organization staff acting on a candidate: admins and recruiters only. */
    public Candidacy requireRecruiterAccess(UUID actingUserId, UUID candidacyId) {
        Candidacy candidacy = getOrThrow(candidacyId);
        organizationAuthorization.requireMembership(actingUserId, candidacy.getOrganizationId(), RECRUITING_ROLES);
        return candidacy;
    }

    /** Organization staff acting on a whole opportunity's candidate pool. */
    public void requireRecruiterAccessToOrganization(UUID actingUserId, UUID organizationId) {
        organizationAuthorization.requireMembership(actingUserId, organizationId, RECRUITING_ROLES);
    }

    /**
     * The candidate student themselves. A candidacy belonging to another student is reported as NOT
     * FOUND rather than FORBIDDEN, so probing UUIDs cannot confirm another student's candidacy
     * exists (CLAUDE.md section 12).
     */
    public Candidacy requireOwningStudent(UUID studentUserId, UUID candidacyId) {
        return candidacies.findById(candidacyId)
                .filter(candidacy -> candidacy.getStudentUserId().equals(studentUserId))
                .orElseThrow(this::notFound);
    }

    public Candidacy getOrThrow(UUID candidacyId) {
        return candidacies.findById(candidacyId).orElseThrow(this::notFound);
    }

    private ApiException notFound() {
        return new ApiException("CANDIDACY_NOT_FOUND", HttpStatus.NOT_FOUND, "Candidacy not found.");
    }
}
