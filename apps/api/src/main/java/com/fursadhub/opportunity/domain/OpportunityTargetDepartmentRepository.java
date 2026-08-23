package com.fursadhub.opportunity.domain;

import java.util.List;
import java.util.UUID;

public interface OpportunityTargetDepartmentRepository {

    OpportunityTargetDepartment save(OpportunityTargetDepartment entry);

    List<OpportunityTargetDepartment> findByOpportunityTargetId(UUID opportunityTargetId);

    void deleteByOpportunityTargetId(UUID opportunityTargetId);
}
