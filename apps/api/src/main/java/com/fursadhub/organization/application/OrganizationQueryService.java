package com.fursadhub.organization.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class OrganizationQueryService {

    private final OrganizationRepository organizations;
    private final OrganizationAuthorization authorization;

    public OrganizationQueryService(OrganizationRepository organizations, OrganizationAuthorization authorization) {
        this.organizations = organizations;
        this.authorization = authorization;
    }

    /** Management detail: requires the caller to hold an active membership at this organization. */
    public Organization getForMember(UUID actingUserId, UUID organizationId) {
        authorization.requireMembership(actingUserId, organizationId);
        return getOrThrow(organizationId);
    }

    public Organization getOrThrow(UUID organizationId) {
        return organizations.findById(organizationId).orElseThrow(this::organizationNotFound);
    }

    /**
     * Resolves many organizations at once, for assembling a page of responses that each embed their
     * organization (Backend Phase B1).
     *
     * <p>Replaces the per-row {@link #getOrThrow} that made {@code GET /api/v1/public/opportunities}
     * issue one query per result — 21 queries for a 20-row page, on the busiest unauthenticated
     * endpoint in the API.
     *
     * <p>Deliberately NOT authorization-bearing: it is the batch form of {@link #getOrThrow}, which
     * is likewise unauthenticated, and it is used only where the caller has already been given
     * these organizations' public summaries. Anything needing membership must go through
     * {@link #getForMember}.
     *
     * @return every requested organization, keyed by id. Duplicate ids collapse to one entry.
     */
    public Map<UUID, Organization> getAllByIds(Collection<UUID> organizationIds) {
        return organizations.findAllById(organizationIds).stream()
                .collect(Collectors.toMap(Organization::getId, Function.identity()));
    }

    /**
     * Looks one organization up in a batch previously resolved by {@link #getAllByIds}, failing the
     * same way {@link #getOrThrow} would.
     *
     * <p>A miss is impossible in practice — {@code internship_opportunities.organization_id} is a
     * foreign key with {@code ON DELETE CASCADE}, so an orphaned opportunity cannot exist. Keeping
     * the throw preserves the previous behaviour exactly rather than silently rendering a card with
     * a blank organization if that invariant were ever violated.
     */
    public Organization requireFrom(Map<UUID, Organization> resolved, UUID organizationId) {
        Organization organization = resolved.get(organizationId);
        if (organization == null) {
            throw organizationNotFound();
        }
        return organization;
    }

    private ApiException organizationNotFound() {
        return new ApiException("ORGANIZATION_NOT_FOUND", HttpStatus.NOT_FOUND, "Organization not found.");
    }
}
