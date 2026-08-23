package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.UUID;

interface JpaInternshipOpportunityRepository
        extends JpaRepository<InternshipOpportunity, UUID>, JpaSpecificationExecutor<InternshipOpportunity> {

    List<InternshipOpportunity> findByOrganizationId(UUID organizationId);
}
