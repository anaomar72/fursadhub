package com.fursadhub.student.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.opportunity.application.PublicOpportunityQueryService;
import com.fursadhub.student.domain.SavedOpportunity;
import com.fursadhub.student.domain.SavedOpportunityRepository;
import com.fursadhub.student.domain.StudentProfileRepository;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * A student's private saved internships (Backend Phase B4).
 *
 * <p><strong>Saving is not applying.</strong> A bookmark creates no candidacy, notifies nobody, and
 * is invisible to the organization. It therefore deliberately does NOT run application eligibility,
 * screening-question validation, nomination rules, or the verified-enrollment prerequisite: those
 * gate candidate intake, and reusing them here would make a private reading list depend on the
 * student's verification progress for no product reason. A student whose enrollment is still
 * {@code DRAFT} or {@code UNDER_REVIEW} can bookmark internships to come back to — which is
 * precisely when a student most needs to.
 *
 * <p>What IS required: the caller must genuinely be operating as a student, and the opportunity must
 * be publicly discoverable right now.
 */
@Service
public class SavedOpportunityService {

    private final SavedOpportunityRepository savedOpportunities;
    private final StudentProfileRepository studentProfiles;
    private final PublicOpportunityQueryService publicOpportunities;

    public SavedOpportunityService(
            SavedOpportunityRepository savedOpportunities, StudentProfileRepository studentProfiles,
            PublicOpportunityQueryService publicOpportunities) {
        this.savedOpportunities = savedOpportunities;
        this.studentProfiles = studentProfiles;
        this.publicOpportunities = publicOpportunities;
    }

    /**
     * Bookmarks a publicly discoverable opportunity for this student. Idempotent.
     *
     * <p>Deliberately NOT {@code @Transactional}. The insert runs in its own transaction inside the
     * repository, so a lost duplicate-key race rolls back there and is caught here as the no-op it
     * is. Were this method transactional, the violation would mark the surrounding transaction
     * rollback-only and the "handled" race would still fail at commit.
     *
     * <p>Visibility is resolved through {@code getPublicOrThrow}, so an opportunity the student
     * could not discover produces the same {@code OPPORTUNITY_NOT_FOUND} 404 as fetching it
     * directly. Saving by id therefore reveals nothing about a draft, targeted-only or
     * suspended-organization opportunity — including that it exists.
     */
    public void save(UUID studentUserId, UUID opportunityId) {
        requireStudent(studentUserId);
        publicOpportunities.getPublicOrThrow(opportunityId);

        // Fast path for the ordinary repeat click; the constraint remains the authority for the race.
        if (savedOpportunities.exists(studentUserId, opportunityId)) {
            return;
        }
        try {
            savedOpportunities.insert(SavedOpportunity.create(studentUserId, opportunityId));
        } catch (DataIntegrityViolationException violation) {
            if (!isDuplicateBookmark(violation, studentUserId, opportunityId)) {
                throw violation;
            }
            // Another request for the same (student, opportunity) committed first. The end state is
            // exactly what this caller asked for — one bookmark — so this is success, not an error.
        }
    }

    /**
     * Whether an integrity failure is specifically the duplicate-bookmark race, and not some other
     * violation wearing the same exception type.
     *
     * <p>This matters because {@code DataIntegrityViolationException} is a wide net: a foreign-key
     * failure (the opportunity or the account deleted between the visibility check and the insert)
     * and any future CHECK violation arrive as the same type. Swallowing those indiscriminately
     * would answer {@code 204 No Content} to a request that saved nothing — the worst kind of bug,
     * because the client is told it succeeded and the bookmark simply is not there.
     *
     * <p>Identified by the constraint name PostgreSQL reports, read from Hibernate's
     * {@code ConstraintViolationException} in the cause chain. If a driver ever fails to report a
     * name, the fallback asks the only question that actually matters — is the bookmark now there? —
     * rather than guessing from the exception type.
     */
    private boolean isDuplicateBookmark(
            DataIntegrityViolationException violation, UUID studentUserId, UUID opportunityId) {
        String constraint = constraintNameOf(violation);
        if (constraint != null) {
            return SavedOpportunity.UNIQUE_CONSTRAINT.equalsIgnoreCase(constraint);
        }
        return savedOpportunities.exists(studentUserId, opportunityId);
    }

    private static String constraintNameOf(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException constraintViolation) {
                return constraintViolation.getConstraintName();
            }
            if (cause.getCause() == cause) {
                break;
            }
        }
        return null;
    }

    /**
     * Removes the bookmark. Idempotent, and deliberately NOT gated on current visibility.
     *
     * <p>A student must be able to tidy their own list even after an opportunity stops being
     * publicly discoverable — otherwise a suspended organization would strand entries the student
     * can neither see nor remove. Deleting by (student, opportunity) touches only rows this student
     * owns, so it can neither affect nor reveal another student's bookmark; a request for something
     * never saved is a successful no-op rather than a 404 that would disclose the difference.
     */
    public void unsave(UUID studentUserId, UUID opportunityId) {
        requireStudent(studentUserId);
        savedOpportunities.delete(studentUserId, opportunityId);
    }

    /** One page of this student's bookmarks whose opportunity is currently publicly discoverable. */
    @Transactional(readOnly = true)
    public Page<SavedOpportunityRepository.SavedOpportunityView> list(UUID studentUserId, Pageable pageable) {
        requireStudent(studentUserId);
        return savedOpportunities.findVisibleByStudent(studentUserId, pageable);
    }

    /**
     * Which of the supplied opportunities this student has saved — the lookup a page of public cards
     * needs to render its bookmark controls.
     *
     * <p>Answers for THIS student only, in one query, and returns nothing but ids: no opportunity
     * data, and no way to learn anything about another student. Unsaved and unknown ids are simply
     * absent from the result, so a caller cannot use it to probe for opportunities either.
     *
     * <p>Reports the saved state of bookmarks regardless of current visibility, because the caller
     * already holds the ids it is asking about — it is asking "did I save this card", and the cards
     * it can see were resolved through the public query.
     */
    @Transactional(readOnly = true)
    public List<UUID> savedIdsAmong(UUID studentUserId, Collection<UUID> opportunityIds) {
        requireStudent(studentUserId);
        return savedOpportunities.findSavedOpportunityIds(studentUserId, opportunityIds);
    }

    /**
     * The caller must actually be a student.
     *
     * <p>Reuses the existing {@code STUDENT_PROFILE_NOT_FOUND} 404 convention rather than inventing
     * a role check: a recruiter or university administrator has no student profile, so they receive
     * the same answer they already get from every other {@code /students/me} route. No RBAC rule was
     * added or relaxed for B4. Someone who legitimately holds both a staff membership and a student
     * profile sees their OWN bookmarks, which is correct — that is their private data as a student.
     */
    private void requireStudent(UUID studentUserId) {
        if (studentProfiles.findByUserId(studentUserId).isEmpty()) {
            throw new ApiException("STUDENT_PROFILE_NOT_FOUND", HttpStatus.NOT_FOUND, "Student profile not found.");
        }
    }
}
