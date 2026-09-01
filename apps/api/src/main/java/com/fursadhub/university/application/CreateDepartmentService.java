package com.fursadhub.university.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.university.domain.Department;
import com.fursadhub.university.domain.DepartmentRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * A university building its own department structure (CLAUDE.md section 25). Phase 8 removed the
 * seeded pilot tenant, so this is no longer a Flyway-only concern: every self-registered university
 * needs a real way to create the departments a coordinator will later be scoped to and a student
 * will later enroll into.
 *
 * <p>Creation is {@code UNIVERSITY_ADMIN}-only — a coordinator operates within departments they are
 * assigned to (CLAUDE.md section 25: "assigned departments only"), they do not create new ones.
 */
@Service
public class CreateDepartmentService {

    private final DepartmentRepository departments;
    private final UniversityQueryService queryService;
    private final UniversityAuthorization authorization;
    private final AuditService audit;

    public CreateDepartmentService(
            DepartmentRepository departments, UniversityQueryService queryService,
            UniversityAuthorization authorization, AuditService audit) {
        this.departments = departments;
        this.queryService = queryService;
        this.authorization = authorization;
        this.audit = audit;
    }

    @Transactional
    public Department create(
            UUID actingUserId, UUID universityId, String name, String code, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);
        queryService.getUniversity(universityId);

        if (departments.existsByUniversityIdAndCode(universityId, code)) {
            throw new ApiException("DEPARTMENT_CODE_ALREADY_EXISTS", HttpStatus.CONFLICT,
                    "A department with this code already exists at your university.");
        }

        Department department = Department.register(universityId, name, code);
        departments.save(department);

        audit.record("DEPARTMENT_CREATED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";departmentId=" + department.getId());

        return department;
    }
}
