package com.fursadhub.university.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.university.domain.Department;
import com.fursadhub.university.domain.PublicUniversityFilter;
import com.fursadhub.university.domain.DepartmentRepository;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityRepository;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class UniversityQueryService {

    private final UniversityRepository universities;
    private final DepartmentRepository departments;
    private final UniversityAuthorization authorization;

    public UniversityQueryService(
            UniversityRepository universities, DepartmentRepository departments, UniversityAuthorization authorization) {
        this.universities = universities;
        this.departments = departments;
        this.authorization = authorization;
    }

    /**
     * Management detail: requires the caller to hold an active membership at this university —
     * the exact counterpart of {@code OrganizationQueryService.getForMember}. Unlike
     * {@link #getUniversity}, which the public directory and department listing also use, this
     * exposes registration number, description and evidence state, which are the tenant's own
     * administrative data.
     */
    public University getForMember(UUID actingUserId, UUID universityId) {
        authorization.requireMembership(actingUserId, universityId);
        return getUniversity(universityId);
    }

    /**
     * The directory used to pick a university — a student claiming enrollment, an organization
     * targeting an opportunity. Phase 7.5 made universities self-registering, so this now filters to
     * {@code VERIFIED} only: an unverified university cannot legitimately receive either kind of
     * pick, and listing it here would offer a choice that fails downstream anyway (a student would
     * enroll somewhere the platform hasn't attested to; an organization would hit
     * {@code TARGET_UNIVERSITY_NOT_VERIFIED} only after selecting it). The single VERIFIED pilot
     * tenant is unaffected.
     */
    public List<University> listUniversities() {
        return universities.findAll().stream()
                .filter(university -> university.getStatus() == InstitutionVerificationStatus.VERIFIED)
                .toList();
    }

    /**
     * The public university directory (Backend Phase B1) — no authentication required.
     *
     * <p><strong>Approved visibility policy:</strong> a university is publicly discoverable if and
     * only if its status is {@code VERIFIED}, using the existing
     * {@link InstitutionVerificationStatus} model rather than any second verification concept. The
     * rule lives in the repository query, so unlike {@link #listUniversities} above this never loads
     * a wider set and narrows it in memory.
     */
    public Page<University> searchPublicDirectory(PublicUniversityFilter filter, Pageable pageable) {
        return universities.searchPublicDirectory(filter, pageable);
    }

    public University getUniversity(UUID universityId) {
        return universities.findById(universityId).orElseThrow(this::universityNotFound);
    }

    public List<Department> listDepartments(UUID universityId) {
        getUniversity(universityId);
        return departments.findByUniversityId(universityId);
    }

    private ApiException universityNotFound() {
        return new ApiException("UNIVERSITY_NOT_FOUND", HttpStatus.NOT_FOUND, "University not found.");
    }
}
