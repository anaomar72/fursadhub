package com.fursadhub.candidacy.application;

import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.candidacy.domain.CandidacyEvent;
import com.fursadhub.candidacy.domain.CandidacyEventRepository;
import com.fursadhub.candidacy.domain.CandidacyEventType;
import com.fursadhub.candidacy.domain.CandidacyRepository;
import com.fursadhub.candidacy.domain.CandidacySource;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.student.domain.StudentEnrollment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * The one place a candidacy is ever created, shared by both entry routes into the pipeline
 * (CLAUDE.md section 36).
 *
 * <p>FursadHub must never end up with two candidacies for the same (opportunity, student) pair, and
 * a student who both self-applies and is nominated must end up with ONE candidacy whose source is
 * {@code BOTH}. Getting that right under concurrency is the point of this class:
 *
 * <ol>
 *   <li>take a transaction-scoped advisory lock on the (opportunity, student) pair, which
 *       serializes a racing self-application and nomination acceptance against each other;</li>
 *   <li>re-read inside the lock — the loser of the race now sees the winner's candidacy;</li>
 *   <li>merge the source (appending history) or insert a fresh candidacy.</li>
 * </ol>
 *
 * <p>A naive "check if exists, then insert" is exactly what this avoids: both transactions would
 * read "nothing exists" before either inserted. The {@code UNIQUE(opportunity_id, student_user_id)}
 * constraint still stands behind all of this as the database-level guarantee (CLAUDE.md section 52).
 *
 * <p>{@code MANDATORY} propagation is deliberate: this must always run inside the caller's
 * transaction, because the advisory lock is only held until that transaction ends and the caller's
 * own work (accepting a nomination, storing screening answers) has to commit or roll back with it.
 */
@Component
public class CandidacyMerger {

    private final CandidacyRepository candidacies;
    private final CandidacyEventRepository events;

    public CandidacyMerger(CandidacyRepository candidacies, CandidacyEventRepository events) {
        this.candidacies = candidacies;
        this.events = events;
    }

    /** The candidacy plus whether this call created it, so callers can branch without re-querying. */
    public record MergeResult(Candidacy candidacy, boolean created) {
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public MergeResult createOrMerge(
            InternshipOpportunity opportunity, StudentEnrollment enrollment, CandidacySource source, UUID actorUserId) {
        UUID studentUserId = enrollment.getStudentUserId();
        candidacies.lockCandidacySlot(opportunity.getId(), studentUserId);

        return candidacies.findByOpportunityIdAndStudentUserId(opportunity.getId(), studentUserId)
                .map(existing -> new MergeResult(mergeInto(existing, source, actorUserId), false))
                .orElseGet(() -> new MergeResult(create(opportunity, enrollment, source, actorUserId), true));
    }

    private Candidacy create(
            InternshipOpportunity opportunity, StudentEnrollment enrollment, CandidacySource source, UUID actorUserId) {
        Candidacy candidacy = Candidacy.open(
                opportunity.getId(),
                enrollment.getStudentUserId(),
                opportunity.getOrganizationId(),
                enrollment.getUniversityId(),
                enrollment.getDepartmentId(),
                source);
        candidacies.save(candidacy);

        events.save(CandidacyEvent.record(
                candidacy.getId(),
                source == CandidacySource.SELF_APPLICATION
                        ? CandidacyEventType.APPLICATION_SUBMITTED
                        : CandidacyEventType.NOMINATION_ACCEPTED,
                actorUserId,
                null,
                candidacy.getStatus(),
                "source=" + source));
        return candidacy;
    }

    private Candidacy mergeInto(Candidacy existing, CandidacySource incoming, UUID actorUserId) {
        // A candidacy that already ran to a terminal outcome must not be silently revived by a new
        // application or nomination — the recruiter's decision stands.
        if (existing.isClosed()) {
            throw new ApiException("CANDIDACY_ALREADY_CLOSED", HttpStatus.CONFLICT,
                    "This candidacy has already been closed and cannot be reopened.");
        }

        boolean merged = existing.mergeSource(incoming);
        if (!merged) {
            // The same route arriving twice (a retry, a double-click) is a no-op, not an error, so
            // repeated requests stay idempotent rather than creating anything new.
            return existing;
        }

        candidacies.save(existing);
        events.save(CandidacyEvent.record(
                existing.getId(),
                CandidacyEventType.SOURCE_MERGED_TO_BOTH,
                actorUserId,
                existing.getStatus(),
                existing.getStatus(),
                "mergedFrom=" + incoming));
        return existing;
    }
}
