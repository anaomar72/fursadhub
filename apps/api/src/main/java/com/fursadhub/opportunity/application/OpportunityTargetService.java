package com.fursadhub.opportunity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.OpportunityStatus;
import com.fursadhub.opportunity.domain.OpportunityTarget;
import com.fursadhub.opportunity.domain.OpportunityTargetDepartment;
import com.fursadhub.opportunity.domain.OpportunityTargetDepartmentRepository;
import com.fursadhub.opportunity.domain.OpportunityTargetRepository;
import com.fursadhub.organization.application.OrganizationAuthorization;
import com.fursadhub.organization.domain.OrganizationRole;
import com.fursadhub.university.domain.DepartmentRepository;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Manages the universities targeted by a {@code UNIVERSITY_TARGETED}/{@code HYBRID} opportunity
 * (CLAUDE.md section 9/10). Targeting can only be edited while the opportunity is still {@code
 * DRAFT}, mirroring {@link UpdateOpportunityService}. Every supplied department id is verified to
 * belong to the target university — a caller must never smuggle in a department from a different
 * university (CLAUDE.md section 10).
 */
@Service
public class OpportunityTargetService {

    private final OpportunityTargetRepository targets;
    private final OpportunityTargetDepartmentRepository targetDepartments;
    private final OpportunityQueryService opportunityQueryService;
    private final OrganizationAuthorization organizationAuthorization;
    private final UniversityRepository universities;
    private final DepartmentRepository departments;
    private final AuditService audit;

    public OpportunityTargetService(
            OpportunityTargetRepository targets, OpportunityTargetDepartmentRepository targetDepartments,
            OpportunityQueryService opportunityQueryService, OrganizationAuthorization organizationAuthorization,
            UniversityRepository universities, DepartmentRepository departments, AuditService audit) {
        this.targets = targets;
        this.targetDepartments = targetDepartments;
        this.opportunityQueryService = opportunityQueryService;
        this.organizationAuthorization = organizationAuthorization;
        this.universities = universities;
        this.departments = departments;
        this.audit = audit;
    }

    public record TargetWithDepartments(OpportunityTarget target, List<UUID> departmentIds) {
    }

    @Transactional
    public TargetWithDepartments addTarget(
            UUID actingUserId, UUID opportunityId, UUID universityId, List<UUID> departmentIds, int requestedNominees,
            LocalDate nominationDeadline, String ipAddress, String userAgent) {
        InternshipOpportunity opportunity = authorizeAndRequireEditableTargeting(actingUserId, opportunityId);

        if (requestedNominees < 1) {
            throw validationFailed("Requested nominees must be at least 1.");
        }
        if (nominationDeadline == null || !nominationDeadline.isBefore(opportunity.getStartDate())) {
            throw validationFailed("The nomination deadline must be before the internship start date.");
        }

        University university = universities.findById(universityId)
                .orElseThrow(() -> new ApiException("UNIVERSITY_NOT_FOUND", HttpStatus.BAD_REQUEST, "University not found."));
        if (!university.isVerified()) {
            throw new ApiException("TARGET_UNIVERSITY_NOT_VERIFIED", HttpStatus.BAD_REQUEST,
                    "Only a verified university can be targeted.");
        }
        if (targets.existsByOpportunityIdAndUniversityId(opportunityId, universityId)) {
            throw new ApiException("OPPORTUNITY_TARGET_ALREADY_EXISTS", HttpStatus.CONFLICT,
                    "This university is already targeted by this opportunity.");
        }

        List<UUID> safeDepartmentIds = departmentIds == null ? List.of() : departmentIds;
        for (UUID departmentId : safeDepartmentIds) {
            if (!departments.existsByIdAndUniversityId(departmentId, universityId)) {
                throw new ApiException("DEPARTMENT_NOT_IN_UNIVERSITY", HttpStatus.BAD_REQUEST,
                        "One or more departments do not belong to the target university.");
            }
        }

        OpportunityTarget target = OpportunityTarget.create(opportunityId, universityId, requestedNominees, nominationDeadline);
        targets.save(target);
        for (UUID departmentId : safeDepartmentIds) {
            targetDepartments.save(OpportunityTargetDepartment.create(target.getId(), departmentId));
        }

        audit.record("OPPORTUNITY_TARGET_ADDED", actingUserId, ipAddress, userAgent,
                "opportunityId=" + opportunityId + ";universityId=" + universityId);

        return new TargetWithDepartments(target, safeDepartmentIds);
    }

    @Transactional
    public void removeTarget(UUID actingUserId, UUID opportunityId, UUID targetId, String ipAddress, String userAgent) {
        authorizeAndRequireEditableTargeting(actingUserId, opportunityId);

        OpportunityTarget target = targets.findById(targetId)
                .filter(t -> t.getOpportunityId().equals(opportunityId))
                .orElseThrow(() -> new ApiException("OPPORTUNITY_TARGET_NOT_FOUND", HttpStatus.NOT_FOUND, "Target not found."));

        targetDepartments.deleteByOpportunityTargetId(target.getId());
        targets.delete(target);

        audit.record("OPPORTUNITY_TARGET_REMOVED", actingUserId, ipAddress, userAgent,
                "opportunityId=" + opportunityId + ";targetId=" + targetId);
    }

    @Transactional(readOnly = true)
    public List<TargetWithDepartments> listTargets(UUID actingUserId, UUID opportunityId) {
        InternshipOpportunity opportunity = opportunityQueryService.getOrThrow(opportunityId);
        organizationAuthorization.requireMembership(actingUserId, opportunity.getOrganizationId());

        return targets.findByOpportunityId(opportunityId).stream()
                .map(target -> new TargetWithDepartments(
                        target,
                        targetDepartments.findByOpportunityTargetId(target.getId()).stream()
                                .map(OpportunityTargetDepartment::getDepartmentId)
                                .toList()))
                .toList();
    }

    private InternshipOpportunity authorizeAndRequireEditableTargeting(UUID actingUserId, UUID opportunityId) {
        InternshipOpportunity opportunity = opportunityQueryService.getOrThrow(opportunityId);
        organizationAuthorization.requireMembership(
                actingUserId, opportunity.getOrganizationId(), OrganizationRole.ORGANIZATION_ADMIN, OrganizationRole.RECRUITER);

        if (opportunity.getMode() != OpportunityMode.UNIVERSITY_TARGETED && opportunity.getMode() != OpportunityMode.HYBRID) {
            throw new ApiException("OPPORTUNITY_MODE_DOES_NOT_SUPPORT_TARGETING", HttpStatus.CONFLICT,
                    "Only university-targeted or hybrid opportunities can have targets.");
        }
        if (opportunity.getStatus() != OpportunityStatus.DRAFT) {
            throw new ApiException("OPPORTUNITY_NOT_EDITABLE", HttpStatus.CONFLICT,
                    "Targets can only be changed while the opportunity is a draft.");
        }
        return opportunity;
    }

    private ApiException validationFailed(String message) {
        return new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, message);
    }
}
