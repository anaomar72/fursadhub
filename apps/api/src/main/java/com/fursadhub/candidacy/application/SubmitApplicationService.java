package com.fursadhub.candidacy.application;

import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.candidacy.domain.CandidacySource;
import com.fursadhub.candidacy.domain.ScreeningAnswer;
import com.fursadhub.candidacy.domain.ScreeningAnswerRepository;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.opportunity.application.OpportunityQueryService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.student.domain.StudentEnrollment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Student self-application to a PUBLIC/HYBRID opportunity (CLAUDE.md Phase 4 section 3).
 *
 * <p>The student is always the authenticated caller — no student/user id is ever accepted from the
 * browser (CLAUDE.md section 12). The university/department recorded on the candidacy come from the
 * student's own VERIFIED enrollment, not from the request.
 */
@Service
public class SubmitApplicationService {

    private final OpportunityQueryService opportunities;
    private final OpportunityApplicationRules applicationRules;
    private final StudentEligibility studentEligibility;
    private final ScreeningAnswerValidator screeningAnswerValidator;
    private final ScreeningAnswerRepository screeningAnswers;
    private final CandidacyMerger candidacyMerger;
    private final AuditService audit;

    public SubmitApplicationService(
            OpportunityQueryService opportunities, OpportunityApplicationRules applicationRules,
            StudentEligibility studentEligibility, ScreeningAnswerValidator screeningAnswerValidator,
            ScreeningAnswerRepository screeningAnswers, CandidacyMerger candidacyMerger, AuditService audit) {
        this.opportunities = opportunities;
        this.applicationRules = applicationRules;
        this.studentEligibility = studentEligibility;
        this.screeningAnswerValidator = screeningAnswerValidator;
        this.screeningAnswers = screeningAnswers;
        this.candidacyMerger = candidacyMerger;
        this.audit = audit;
    }

    /**
     * Creates the student's candidacy, or merges {@code SELF_APPLICATION} into the candidacy an
     * accepted nomination already opened (CLAUDE.md section 36 — never a second candidacy).
     */
    @Transactional
    public Candidacy apply(
            UUID studentUserId, UUID opportunityId, List<ScreeningAnswerValidator.SubmittedAnswer> submittedAnswers,
            String ipAddress, String userAgent) {
        InternshipOpportunity opportunity = opportunities.getOrThrow(opportunityId);
        applicationRules.requireOpenForSelfApplication(opportunity);

        StudentEnrollment enrollment = studentEligibility.requireVerifiedEnrollment(studentUserId);
        studentEligibility.requireAvailable(studentUserId);

        // Validated before the merge so a rejected answer set never leaves a half-created candidacy
        // behind, and so an invalid answer is reported even when merging into an existing candidacy.
        Map<UUID, String> validatedAnswers = screeningAnswerValidator.validate(opportunityId, submittedAnswers);

        CandidacyMerger.MergeResult result = candidacyMerger.createOrMerge(
                opportunity, enrollment, CandidacySource.SELF_APPLICATION, studentUserId);

        if (!result.created() && result.candidacy().getSource() == CandidacySource.SELF_APPLICATION) {
            // Same student, same opportunity, already self-applied: an explicit business error rather
            // than a silent no-op, so the UI can tell the student what happened.
            throw new ApiException("STUDENT_ALREADY_APPLIED", HttpStatus.CONFLICT,
                    "You have already applied to this opportunity.");
        }

        storeAnswers(result.candidacy(), validatedAnswers);

        audit.record("CANDIDACY_APPLICATION_SUBMITTED", studentUserId, ipAddress, userAgent,
                "candidacyId=" + result.candidacy().getId() + ";opportunityId=" + opportunityId);
        return result.candidacy();
    }

    /**
     * Answers are only written once. If the candidacy already came from a nomination the student is
     * now also self-applying to, this is their first answer set; existing answers are never
     * overwritten (CLAUDE.md section 51).
     */
    private void storeAnswers(Candidacy candidacy, Map<UUID, String> validatedAnswers) {
        if (validatedAnswers.isEmpty() || !screeningAnswers.findByCandidacyId(candidacy.getId()).isEmpty()) {
            return;
        }
        validatedAnswers.forEach((questionId, answer) ->
                screeningAnswers.save(ScreeningAnswer.create(candidacy.getId(), questionId, answer)));
    }
}
