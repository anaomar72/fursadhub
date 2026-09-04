package com.fursadhub.organization.application;

import com.fursadhub.opportunity.domain.InternshipOpportunityRepository;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationRepository;
import com.fursadhub.organization.domain.PublicOrganizationFilter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The public organization directory (Backend Phase B1) — no authentication required, the same way
 * {@code PublicOpportunityQueryService} needs none.
 *
 * <p><strong>Approved visibility policy:</strong> an organization is publicly discoverable if and
 * only if its verification status is {@code VERIFIED}. This is deliberately NOT
 * "verified OR has a published opportunity" — an unverified organization must never become
 * discoverable merely because an opportunity row exists. Conversely a verified organization stays
 * in the directory with zero open opportunities: this directory lists organizations FursadHub has
 * attested to, not organizations that happen to be hiring today.
 *
 * <p>The rule lives in the repository query itself, not here, so no call site can widen it.
 */
@Service
@Transactional(readOnly = true)
public class PublicOrganizationDirectoryService {

    private final OrganizationRepository organizations;
    private final InternshipOpportunityRepository opportunities;

    public PublicOrganizationDirectoryService(
            OrganizationRepository organizations, InternshipOpportunityRepository opportunities) {
        this.organizations = organizations;
        this.opportunities = opportunities;
    }

    /**
     * One page of the directory, with each organization's open-opportunity count already resolved.
     *
     * <p>Exactly TWO queries regardless of page size: one for the page (plus Spring Data's count
     * query for the total), and one grouped aggregate for every organization on it. Never one count
     * per card.
     */
    public Page<DirectoryEntry> search(PublicOrganizationFilter filter, Pageable pageable) {
        Page<Organization> page = organizations.searchPublicDirectory(filter, pageable);

        List<UUID> organizationIds = page.getContent().stream().map(Organization::getId).toList();
        Map<UUID, Long> openCounts = opportunities.countPublicByOrganizationIds(organizationIds);

        // An organization with no publicly visible opportunities is absent from the grouped result,
        // which is a real zero rather than missing data.
        return page.map(organization ->
                new DirectoryEntry(organization, openCounts.getOrDefault(organization.getId(), 0L)));
    }

    /**
     * One directory row: the organization aggregate plus the count that had to be resolved
     * separately. Kept as a domain-facing pair so the API layer still owns DTO shaping — the
     * controller maps this to its response record, and the entity itself never leaves the module.
     */
    public record DirectoryEntry(Organization organization, long openOpportunityCount) {
    }
}
