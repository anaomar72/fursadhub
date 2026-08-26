package com.fursadhub.internshipmanagement.api;

import com.fursadhub.internshipmanagement.application.InternshipPolicyService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Internship policy configuration (CLAUDE.md section 41).
 *
 * <p>Policy is CONFIGURATION, not a business state machine, so {@code PUT} is the right verb here —
 * the rule against generic status mutation (CLAUDE.md section 10) is about business transitions such
 * as publishing an opportunity or completing a placement, none of which live on this resource.
 *
 * <p>The university id in the path is never trusted on its own: the service re-reads the caller's
 * current membership at THAT university, and a department id must actually belong to it, so changing
 * a UUID in the URL cannot configure another university's requirements.
 */
@RestController
@RequestMapping("/api/v1/universities/{universityId}")
public class InternshipPolicyController {

    private final InternshipPolicyService policyService;

    public InternshipPolicyController(InternshipPolicyService policyService) {
        this.policyService = policyService;
    }

    // ---------------------------------------------------------------- university level

    /** The university-wide default. Readable by any staff member with policy authority. */
    @GetMapping("/internship-policy")
    public InternshipPolicyResponse getUniversityPolicy(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId) {
        return InternshipPolicyResponse.from(policyService.view(currentUserId(jwt), universityId, null));
    }

    /** Sets the university-wide default. University admins only. */
    @PutMapping("/internship-policy")
    public InternshipPolicyResponse setUniversityPolicy(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId,
            @Valid @RequestBody InternshipPolicyRequest request) {
        return InternshipPolicyResponse.from(save(jwt, universityId, null, request));
    }

    // ---------------------------------------------------------------- department level

    /**
     * What applies to one department. A department with no override of its own reports the
     * university's values with {@code source=UNIVERSITY}, so staff see what students are actually
     * held to rather than an empty form.
     */
    @GetMapping("/departments/{departmentId}/internship-policy")
    public InternshipPolicyResponse getDepartmentPolicy(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID departmentId) {
        return InternshipPolicyResponse.from(policyService.view(currentUserId(jwt), universityId, departmentId));
    }

    /** Sets a department override. Admins anywhere in their university; coordinators in scope only. */
    @PutMapping("/departments/{departmentId}/internship-policy")
    public InternshipPolicyResponse setDepartmentPolicy(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID departmentId,
            @Valid @RequestBody InternshipPolicyRequest request) {
        return InternshipPolicyResponse.from(save(jwt, universityId, departmentId, request));
    }

    /**
     * Removes the override so the department follows the university default again.
     *
     * <p>Distinct from setting everything to false, which would mean "this department requires
     * nothing" — a decision, not a deferral.
     */
    @DeleteMapping("/departments/{departmentId}/internship-policy")
    public InternshipPolicyResponse clearDepartmentPolicy(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID departmentId) {
        return InternshipPolicyResponse.from(
                policyService.deleteDepartmentOverride(currentUserId(jwt), universityId, departmentId));
    }

    // ---------------------------------------------------------------- helpers

    private com.fursadhub.internshipmanagement.domain.ResolvedInternshipPolicy save(
            Jwt jwt, UUID universityId, UUID departmentId, InternshipPolicyRequest request) {
        return policyService.save(
                currentUserId(jwt), universityId, departmentId,
                request.weeklyLogsRequired(), request.attendanceRequired(),
                request.organizationEvaluationRequired(), request.finalReportRequired(),
                request.defenseRequired());
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
