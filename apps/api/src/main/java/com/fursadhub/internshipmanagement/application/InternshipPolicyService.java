package com.fursadhub.internshipmanagement.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.internshipmanagement.domain.InternshipPolicy;
import com.fursadhub.internshipmanagement.domain.InternshipPolicyRepository;
import com.fursadhub.internshipmanagement.domain.ResolvedInternshipPolicy;
import com.fursadhub.university.domain.Department;
import com.fursadhub.university.domain.DepartmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Configuring internship policy (CLAUDE.md section 41, Phase 6 section 3).
 *
 * <p>A university admin sets the university-wide default; an admin or a coordinator in scope sets a
 * department override. There are exactly two levels and five booleans — no inheritance chain, no
 * partial merging, no rules language.
 *
 * <p>Deleting a department override is a first-class operation rather than "set everything false",
 * because those mean different things: false means "this department requires nothing", while removing
 * the override means "this department follows the university again".
 */
@Service
public class InternshipPolicyService {

    private final InternshipPolicyRepository policies;
    private final InternshipPolicyResolver resolver;
    private final InternshipManagementAuthorization authorization;
    private final DepartmentRepository departments;

    public InternshipPolicyService(
            InternshipPolicyRepository policies, InternshipPolicyResolver resolver,
            InternshipManagementAuthorization authorization, DepartmentRepository departments) {
        this.policies = policies;
        this.resolver = resolver;
        this.authorization = authorization;
        this.departments = departments;
    }

    // ---------------------------------------------------------------- read

    /**
     * What currently applies at this level, whether or not a row exists here.
     *
     * <p>A department with no override reports the university's values with source UNIVERSITY, so
     * staff can see what their students are actually held to rather than an empty form.
     */
    @Transactional(readOnly = true)
    public ResolvedInternshipPolicy view(UUID actingUserId, UUID universityId, UUID departmentId) {
        authorization.requirePolicyAuthority(actingUserId, universityId, departmentId);
        if (departmentId != null) {
            requireDepartmentBelongsToUniversity(universityId, departmentId);
        }
        return resolver.previewFor(universityId, departmentId);
    }

    // ---------------------------------------------------------------- write

    /** Creates or replaces the policy at this level. */
    @Transactional
    public ResolvedInternshipPolicy save(
            UUID actingUserId, UUID universityId, UUID departmentId,
            boolean weeklyLogsRequired, boolean attendanceRequired, boolean organizationEvaluationRequired,
            boolean finalReportRequired, boolean defenseRequired) {
        authorization.requirePolicyAuthority(actingUserId, universityId, departmentId);
        if (departmentId != null) {
            requireDepartmentBelongsToUniversity(universityId, departmentId);
        }

        InternshipPolicy policy = resolver.findConfigured(universityId, departmentId);
        if (policy == null) {
            policy = InternshipPolicy.create(universityId, departmentId, actingUserId);
        }
        policy.update(weeklyLogsRequired, attendanceRequired, organizationEvaluationRequired,
                finalReportRequired, defenseRequired, actingUserId);
        policies.save(policy);

        // Existing placements are unaffected: they resolved and froze their own requirements the
        // first time Phase 6 touched them (Phase 6 section 4).
        return resolver.previewFor(universityId, departmentId);
    }

    /** Removes a department override so the department follows the university default again. */
    @Transactional
    public ResolvedInternshipPolicy deleteDepartmentOverride(
            UUID actingUserId, UUID universityId, UUID departmentId) {
        authorization.requirePolicyAuthority(actingUserId, universityId, departmentId);
        requireDepartmentBelongsToUniversity(universityId, departmentId);

        InternshipPolicy override = resolver.findConfigured(universityId, departmentId);
        if (override != null) {
            policies.delete(override);
        }
        return resolver.previewFor(universityId, departmentId);
    }

    // ---------------------------------------------------------------- helpers

    /**
     * A department id from the request must actually belong to the university the caller has
     * authority over. Without this, an admin at University A could attach a policy to University B's
     * department by changing a UUID — the exact cross-tenant move CLAUDE.md section 25 forbids.
     * The database trigger added in V24 enforces the same rule as a second line of defence.
     */
    private void requireDepartmentBelongsToUniversity(UUID universityId, UUID departmentId) {
        boolean valid = departments.findById(departmentId)
                .map(Department::getUniversityId)
                .filter(universityId::equals)
                .isPresent();
        if (!valid) {
            throw new ApiException("DEPARTMENT_NOT_FOUND", HttpStatus.NOT_FOUND, "Department not found.");
        }
    }
}
