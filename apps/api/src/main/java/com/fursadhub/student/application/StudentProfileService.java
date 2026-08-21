package com.fursadhub.student.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.student.domain.StudentProfile;
import com.fursadhub.student.domain.StudentProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class StudentProfileService {

    private final StudentProfileRepository profiles;

    public StudentProfileService(StudentProfileRepository profiles) {
        this.profiles = profiles;
    }

    @Transactional(readOnly = true)
    public StudentProfile getMyProfile(UUID studentUserId) {
        return profiles.findByUserId(studentUserId)
                .orElseThrow(() -> new ApiException("STUDENT_PROFILE_NOT_FOUND", HttpStatus.NOT_FOUND, "Student profile not found."));
    }

    @Transactional
    public StudentProfile upsert(UUID studentUserId, String fullName, String phone) {
        StudentProfile profile = profiles.findByUserId(studentUserId)
                .map(existing -> {
                    existing.update(fullName, phone);
                    return existing;
                })
                .orElseGet(() -> StudentProfile.create(studentUserId, fullName, phone));
        return profiles.save(profile);
    }
}
