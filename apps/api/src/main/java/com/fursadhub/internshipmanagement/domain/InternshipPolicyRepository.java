package com.fursadhub.internshipmanagement.domain;

import java.util.Optional;
import java.util.UUID;

public interface InternshipPolicyRepository {

    InternshipPolicy save(InternshipPolicy policy);

    /** The university-wide default, i.e. the row whose department is null. */
    Optional<InternshipPolicy> findUniversityDefault(UUID universityId);

    /** A department override. Scoped by university as well, so a stray department id cannot cross tenants. */
    Optional<InternshipPolicy> findDepartmentOverride(UUID universityId, UUID departmentId);

    void delete(InternshipPolicy policy);
}
