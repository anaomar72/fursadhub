package com.fursadhub.organization.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.api.ProfileText;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationProfileFields;
import com.fursadhub.organization.domain.OrganizationRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;

/** Organization profile management, restricted to {@code ORGANIZATION_ADMIN} (CLAUDE.md section 26). */
@Service
public class UpdateOrganizationService {

    private final OrganizationRepository organizations;
    private final OrganizationQueryService queryService;
    private final OrganizationAuthorization authorization;
    private final AuditService audit;
    private final Clock clock;

    public UpdateOrganizationService(
            OrganizationRepository organizations, OrganizationQueryService queryService,
            OrganizationAuthorization authorization, AuditService audit, Clock clock) {
        this.organizations = organizations;
        this.queryService = queryService;
        this.authorization = authorization;
        this.audit = audit;
        this.clock = clock;
    }

    /**
     * Replaces the organization's editable profile.
     *
     * <p>Authorization is unchanged by Backend Phase B2: {@code ORGANIZATION_ADMIN} at THIS
     * organization, and nobody else. A recruiter, a supervisor, an admin of another organization and
     * an anonymous caller are all refused by {@code requireMembership} before any field is read.
     * Super Admin is deliberately not an editor here — it verifies institutions, it does not write
     * their marketing copy.
     *
     * <p><strong>Two update semantics, resolved here.</strong> The four pre-B2 fields keep FULL
     * REPLACEMENT — omitting one clears it — because callers written against that contract may rely
     * on it. The fields Backend Phase B2 added are presence-aware: omitting one PRESERVES what is
     * stored, and only an explicit null clears it. Without that split, the pre-B2 management form —
     * which cannot send fields it does not know about — would erase an admin's industry, location,
     * size, founding year and social links on every save.
     */
    @Transactional
    public Organization update(
            UUID actingUserId, UUID organizationId, OrganizationProfileUpdate update,
            String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);

        Organization organization = queryService.getOrThrow(organizationId);
        organization.updateProfile(resolve(update, organization));
        organizations.save(organization);

        // Metadata stays an identifier, as everywhere else in the audit trail — profile copy is not
        // recorded into audit events (CLAUDE.md section 68).
        audit.record("ORGANIZATION_PROFILE_UPDATED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId);

        return organization;
    }

    /**
     * Enters the platform review queue. The domain object refuses this without attached evidence and
     * from any state other than DRAFT/NEEDS_CHANGES; this service never assigns the status itself.
     */
    @Transactional
    public Organization submitForVerification(UUID actingUserId, UUID organizationId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);

        Organization organization = queryService.getOrThrow(organizationId);
        organization.submitForVerification();
        organizations.save(organization);

        audit.record("ORGANIZATION_VERIFICATION_SUBMITTED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId);

        return organization;
    }

    /**
     * Turns the submitted request into the profile the organization will hold: pre-B2 fields
     * replaced outright, B2 fields resolved against {@code current}, everything normalised.
     *
     * <p>A field the client omitted is copied from {@code current} WITHOUT re-normalising it. It was
     * normalised when it was written, and re-running the rules on a value nobody mentioned would let
     * an unrelated save quietly rewrite stored data if those rules ever change.
     *
     * <p>Also carries the one rule Bean Validation cannot express: a founded year must not be in the
     * future. That needs the injected {@link Clock} — a {@code @Max} annotation would have to
     * hardcode a year, and a database CHECK cannot call {@code now()} at all because PostgreSQL
     * requires IMMUTABLE expressions there. It is checked only when the client actually SENT a year,
     * for the same reason: a preserved value was already validated when it was stored.
     */
    private OrganizationProfileFields resolve(OrganizationProfileUpdate update, Organization current) {
        Integer foundedYear = update.foundedYear().resolve(current.getFoundedYear());
        if (update.foundedYear().isPresent() && foundedYear != null
                && foundedYear > LocalDate.now(clock).getYear()) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "Founded year cannot be in the future.");
        }

        return new OrganizationProfileFields(
                ProfileText.normalize(update.name()),
                ProfileText.normalize(update.registrationNumber()),
                ProfileText.normalize(update.website()),
                // Description keeps its own line breaks — collapsing whitespace would destroy the
                // paragraphing of a 2000-character profile body.
                trimOrNull(update.description()),
                update.industry().resolve(current.getIndustry(), ProfileText::normalize),
                update.city().resolve(current.getCity(), ProfileText::normalize),
                update.countryCode().resolve(current.getCountryCode(), ProfileText::normalizeCountryCode),
                update.shortDescription().resolve(current.getShortDescription(), ProfileText::normalize),
                update.companySizeRange().resolve(current.getCompanySizeRange()),
                foundedYear,
                update.linkedinUrl().resolve(current.getLinkedinUrl(), ProfileText::normalize),
                update.xUrl().resolve(current.getXUrl(), ProfileText::normalize),
                update.instagramUrl().resolve(current.getInstagramUrl(), ProfileText::normalize),
                update.youtubeUrl().resolve(current.getYoutubeUrl(), ProfileText::normalize));
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
