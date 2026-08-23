package com.fursadhub.opportunity.api;

import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.opportunity.application.ScreeningQuestionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Organization-side screening-question management for a draft opportunity (CLAUDE.md Phase 4 section 9). */
@RestController
@RequestMapping("/api/v1/opportunities/{opportunityId}/screening-questions")
public class ScreeningQuestionController {

    private final ScreeningQuestionService screeningQuestionService;

    public ScreeningQuestionController(ScreeningQuestionService screeningQuestionService) {
        this.screeningQuestionService = screeningQuestionService;
    }

    @GetMapping
    public List<ScreeningQuestionResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId) {
        return screeningQuestionService.listForManagement(currentUserId(jwt), opportunityId).stream()
                .map(ScreeningQuestionResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<ScreeningQuestionResponse> add(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId,
            @Valid @RequestBody CreateScreeningQuestionRequest request) {
        ScreeningQuestionService.QuestionWithChoices created = screeningQuestionService.addQuestion(
                currentUserId(jwt), opportunityId, request.prompt(), request.type(), request.required(), request.choices());
        return ResponseEntity.status(HttpStatus.CREATED).body(ScreeningQuestionResponse.from(created));
    }

    @DeleteMapping("/{questionId}")
    public MessageResponse remove(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, @PathVariable UUID questionId) {
        screeningQuestionService.removeQuestion(currentUserId(jwt), opportunityId, questionId);
        return new MessageResponse("Screening question removed.");
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
