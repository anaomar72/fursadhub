package com.fursadhub.student.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.student.application.StudentEnrollmentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Self-service only — never accepts another student's id (CLAUDE.md section 12). */
@RestController
@RequestMapping("/api/v1/students/me/enrollment")
public class StudentEnrollmentController {

    private final StudentEnrollmentService enrollmentService;

    public StudentEnrollmentController(StudentEnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @GetMapping
    public StudentEnrollmentResponse get(@AuthenticationPrincipal Jwt jwt) {
        return StudentEnrollmentResponse.from(enrollmentService.getMyEnrollment(currentUserId(jwt)));
    }

    @PostMapping
    public ResponseEntity<StudentEnrollmentResponse> claim(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ClaimEnrollmentRequest request, HttpServletRequest httpRequest) {
        var enrollment = enrollmentService.claim(
                currentUserId(jwt), request.universityId(), request.departmentId(), request.studentNumber(),
                request.program(), request.academicYear(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(StudentEnrollmentResponse.from(enrollment));
    }

    @PutMapping
    public StudentEnrollmentResponse update(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ClaimEnrollmentRequest request, HttpServletRequest httpRequest) {
        var enrollment = enrollmentService.update(
                currentUserId(jwt), request.universityId(), request.departmentId(), request.studentNumber(),
                request.program(), request.academicYear(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return StudentEnrollmentResponse.from(enrollment);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
