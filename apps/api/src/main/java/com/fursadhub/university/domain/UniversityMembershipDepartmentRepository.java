package com.fursadhub.university.domain;

import java.util.List;
import java.util.UUID;

public interface UniversityMembershipDepartmentRepository {

    UniversityMembershipDepartment save(UniversityMembershipDepartment scope);

    List<UniversityMembershipDepartment> findActiveByMembershipId(UUID membershipId);

    boolean existsActiveForMembershipAndDepartment(UUID membershipId, UUID departmentId);
}
