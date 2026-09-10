package com.fursadhub.student.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.student.domain.StudentProfile;
import com.fursadhub.student.domain.StudentProfileRepository;
import com.fursadhub.student.domain.StudentProfessionalProfile;
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
    public StudentProfile upsert(UUID studentUserId, String fullName, String phone, StudentProfessionalProfile professional) {
        if (professional != null) {
            validateUrl(professional.linkedinUrl());
            validateUrl(professional.githubUrl());
            validateUrl(professional.portfolioUrl());
            if (professional.countryCode() != null && !java.util.Locale.getISOCountries(java.util.Locale.IsoCountryCode.PART1_ALPHA2).contains(professional.countryCode())) {
                throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, "Choose a valid country.");
            }
        }
        StudentProfile profile = profiles.findByUserId(studentUserId)
                .map(existing -> {
                    existing.update(fullName, phone);
                    return existing;
                })
                .orElseGet(() -> StudentProfile.create(studentUserId, fullName, phone));
        // Older clients sending only name/phone must not erase professional details.
        if (professional != null) profile.updateProfessional(professional);
        return profiles.save(profile);
    }

    private void validateUrl(String value) {
        if (value == null || value.isBlank()) return;
        try {
            var uri = java.net.URI.create(value);
            if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null || uri.getUserInfo() != null) throw new IllegalArgumentException();
        } catch (IllegalArgumentException invalid) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, "Professional links must be valid HTTP or HTTPS URLs without credentials.");
        }
    }
}
