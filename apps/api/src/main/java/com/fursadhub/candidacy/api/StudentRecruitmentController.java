package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.CandidacyQueryService;
import com.fursadhub.candidacy.application.NominationQueryService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * A student's own recruitment views (CLAUDE.md Phase 4 section 12). Every route is rooted at
 * {@code /students/me/...} and scoped to the authenticated caller, so changing a UUID cannot
 * surface another student's applications, nominations, or offers.
 */
@RestController
@RequestMapping("/api/v1/students/me")
public class StudentRecruitmentController {

    private final CandidacyQueryService candidacyQueryService;
    private final NominationQueryService nominationQueryService;

    public StudentRecruitmentController(
            CandidacyQueryService candidacyQueryService, NominationQueryService nominationQueryService) {
        this.candidacyQueryService = candidacyQueryService;
        this.nominationQueryService = nominationQueryService;
    }

    @GetMapping("/candidacies")
    public List<StudentCandidacyResponse> listCandidacies(@AuthenticationPrincipal Jwt jwt) {
        return candidacyQueryService.listForStudent(currentUserId(jwt)).stream()
                .map(StudentCandidacyResponse::from)
                .toList();
    }

    @GetMapping("/candidacies/{candidacyId}")
    public StudentCandidacyResponse getCandidacy(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID candidacyId) {
        return StudentCandidacyResponse.from(candidacyQueryService.getForStudent(currentUserId(jwt), candidacyId));
    }

    @GetMapping("/nominations")
    public List<StudentNominationResponse> listNominations(@AuthenticationPrincipal Jwt jwt) {
        return nominationQueryService.listForStudent(currentUserId(jwt)).stream()
                .map(StudentNominationResponse::from)
                .toList();
    }

    @GetMapping("/offers")
    public List<InternshipOfferResponse> listOffers(@AuthenticationPrincipal Jwt jwt) {
        return candidacyQueryService.listOffersForStudent(currentUserId(jwt)).stream()
                .map(InternshipOfferResponse::from)
                .toList();
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
