package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.OpportunityTargetDepartment;
import com.fursadhub.opportunity.domain.OpportunityTargetDepartmentRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
class OpportunityTargetDepartmentRepositoryAdapter implements OpportunityTargetDepartmentRepository {

    private final JpaOpportunityTargetDepartmentRepository jpaRepository;

    OpportunityTargetDepartmentRepositoryAdapter(JpaOpportunityTargetDepartmentRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public OpportunityTargetDepartment save(OpportunityTargetDepartment entry) {
        return jpaRepository.save(entry);
    }

    @Override
    public List<OpportunityTargetDepartment> findByOpportunityTargetId(UUID opportunityTargetId) {
        return jpaRepository.findByOpportunityTargetId(opportunityTargetId);
    }

    @Override
    public void deleteByOpportunityTargetId(UUID opportunityTargetId) {
        jpaRepository.deleteByOpportunityTargetId(opportunityTargetId);
    }
}
