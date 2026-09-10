package com.fursadhub.student.api;

import com.fursadhub.student.domain.StudentProfile;

public record StudentProfileResponse(String userId, String fullName, String phone,
        com.fursadhub.student.domain.StudentProfessionalProfile professional) {

    public static StudentProfileResponse from(StudentProfile profile) {
        return new StudentProfileResponse(profile.getUserId().toString(), profile.getFullName(), profile.getPhone(), profile.getProfessional());
    }
}
