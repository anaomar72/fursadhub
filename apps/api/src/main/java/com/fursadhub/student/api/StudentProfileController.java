package com.fursadhub.student.api;

import com.fursadhub.student.application.StudentProfileService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Self-service only — the profile acted on is always the authenticated caller's own (CLAUDE.md section 12). */
@RestController
@RequestMapping("/api/v1/students/me/profile")
public class StudentProfileController {

    private final StudentProfileService profileService;

    public StudentProfileController(StudentProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public StudentProfileResponse get(@AuthenticationPrincipal Jwt jwt) {
        return StudentProfileResponse.from(profileService.getMyProfile(currentUserId(jwt)));
    }

    @PutMapping
    public StudentProfileResponse upsert(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody StudentProfileRequest request) {
        return StudentProfileResponse.from(profileService.upsert(currentUserId(jwt), request.fullName(), request.phone()));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
