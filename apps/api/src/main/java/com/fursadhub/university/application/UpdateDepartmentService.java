package com.fursadhub.university.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.university.domain.Department;
import com.fursadhub.university.domain.DepartmentRepository;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Renaming an existing department. Unlike creation, this is open to the department's own
 * {@code DEPARTMENT_COORDINATOR} as well as {@code UNIVERSITY_ADMIN} — "managing" a department one
 * is assigned to is squarely within the coordinator's own scope (CLAUDE.md section 25), whereas
 * standing up a new department is a whole-university act.
 *
 * <p>The department code is deliberately not editable here: it is stable identity, the same way an
 * organization's slug never changes after creation.
 */
@Service
public class UpdateDepartmentService {

    private final DepartmentRepository departments;
    private final UniversityAuthorization authorization;
    private final AuditService audit;

    public UpdateDepartmentService(
            DepartmentRepository departments, UniversityAuthorization authorization, AuditService audit) {
        this.departments = departments;
        this.authorization = authorization;
        this.audit = audit;
    }

    @Transactional
    public Department update(
            UUID actingUserId, UUID universityId, UUID departmentId, String name, String ipAddress, String userAgent) {
        UniversityMembership membership = authorization.requireMembership(
                actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);

        Department department = departments.findById(departmentId)
                .filter(candidate -> candidate.getUniversityId().equals(universityId))
                .orElseThrow(() -> new ApiException(
                        "DEPARTMENT_NOT_FOUND", HttpStatus.NOT_FOUND, "No such department at this university."));

        authorization.requireDepartmentScope(membership, departmentId);

        department.updateName(name);
        departments.save(department);

        audit.record("DEPARTMENT_UPDATED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";departmentId=" + departmentId);

        return department;
    }
}
