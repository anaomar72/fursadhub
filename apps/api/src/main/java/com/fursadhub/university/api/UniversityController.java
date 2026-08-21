package com.fursadhub.university.api;

import com.fursadhub.university.application.UniversityQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Read-only university/department directory used e.g. by the student enrollment claim form. */
@RestController
@RequestMapping("/api/v1/universities")
public class UniversityController {

    private final UniversityQueryService queryService;

    public UniversityController(UniversityQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public List<UniversityResponse> list() {
        return queryService.listUniversities().stream().map(UniversityResponse::from).toList();
    }

    @GetMapping("/{universityId}/departments")
    public List<DepartmentResponse> departments(@PathVariable UUID universityId) {
        return queryService.listDepartments(universityId).stream().map(DepartmentResponse::from).toList();
    }
}
