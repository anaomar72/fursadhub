package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.ScreeningAnswerValidator;
import com.fursadhub.candidacy.application.SubmitApplicationService;
import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.common.web.RequestMetadata;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Student self-application (CLAUDE.md Phase 4 section 3).
 *
 * <p>The applying student is the authenticated caller — the request body contains no student id
 * (CLAUDE.md section 12), so there is no way to create an application on someone else's behalf.
 */
@RestController
@RequestMapping("/api/v1/opportunities/{opportunityId}/applications")
public class OpportunityApplicationController {

    private final SubmitApplicationService submitApplicationService;

    public OpportunityApplicationController(SubmitApplicationService submitApplicationService) {
        this.submitApplicationService = submitApplicationService;
    }

    @PostMapping
    public ResponseEntity<CandidacyResponse> apply(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID opportunityId,
            @Valid @RequestBody(required = false) SubmitApplicationRequest request,
            HttpServletRequest httpRequest) {
        Candidacy candidacy = submitApplicationService.apply(
                currentUserId(jwt),
                opportunityId,
                toSubmittedAnswers(request),
                RequestMetadata.clientIp(httpRequest),
                RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(CandidacyResponse.from(candidacy));
    }

    /** An opportunity with no screening questions is applied to with an empty/absent body. */
    private List<ScreeningAnswerValidator.SubmittedAnswer> toSubmittedAnswers(SubmitApplicationRequest request) {
        if (request == null || request.answers() == null) {
            return List.of();
        }
        return request.answers().stream()
                .map(answer -> new ScreeningAnswerValidator.SubmittedAnswer(answer.questionId(), answer.answer()))
                .toList();
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
