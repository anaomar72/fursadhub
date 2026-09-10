package com.fursadhub.university.domain;

import java.util.List;
import java.util.UUID;

public interface UniversityMembershipDepartmentRepository {

    UniversityMembershipDepartment save(UniversityMembershipDepartment scope);

    /**
     * Saves and flushes immediately.
     *
     * <p>Needed when a scope row is REMOVED and the same department is then re-assigned inside the
     * same transaction. {@code uk_membership_departments_active} is UNIQUE on
     * (membership_id, department_id) WHERE removed_at IS NULL, and Hibernate orders inserts before
     * updates at flush — so without this the re-assignment INSERT reaches the index while the old
     * row still looks active, and the legitimate "change role, keep the same department" fails as a
     * conflict.
     */
    UniversityMembershipDepartment saveAndFlush(UniversityMembershipDepartment scope);

    List<UniversityMembershipDepartment> findActiveByMembershipId(UUID membershipId);

    boolean existsActiveForMembershipAndDepartment(UUID membershipId, UUID departmentId);
}
