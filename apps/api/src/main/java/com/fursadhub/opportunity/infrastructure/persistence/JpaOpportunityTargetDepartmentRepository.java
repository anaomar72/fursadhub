package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.OpportunityTargetDepartment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaOpportunityTargetDepartmentRepository extends JpaRepository<OpportunityTargetDepartment, UUID> {

    List<OpportunityTargetDepartment> findByOpportunityTargetId(UUID opportunityTargetId);

    void deleteByOpportunityTargetId(UUID opportunityTargetId);
}
