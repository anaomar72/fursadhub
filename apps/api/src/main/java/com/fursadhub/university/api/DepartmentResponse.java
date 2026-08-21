package com.fursadhub.university.api;

import com.fursadhub.university.domain.Department;

public record DepartmentResponse(String id, String universityId, String name, String code) {

    public static DepartmentResponse from(Department department) {
        return new DepartmentResponse(
                department.getId().toString(),
                department.getUniversityId().toString(),
                department.getName(),
                department.getCode());
    }
}
