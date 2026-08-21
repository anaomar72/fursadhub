package com.fursadhub.university.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.university.domain.Department;
import com.fursadhub.university.domain.DepartmentRepository;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityRepository;
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

    public UniversityQueryService(UniversityRepository universities, DepartmentRepository departments) {
        this.universities = universities;
        this.departments = departments;
    }

    public List<University> listUniversities() {
        return universities.findAll();
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
