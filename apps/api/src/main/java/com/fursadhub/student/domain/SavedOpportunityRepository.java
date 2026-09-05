package com.fursadhub.student.domain;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Persistence for a student's private bookmarks (Backend Phase B4). */
public interface SavedOpportunityRepository {

    /**
     * Inserts the bookmark. Throws {@code DataIntegrityViolationException} when one already exists
     * for this (student, opportunity) — the unique constraint is the authority, and the caller
     * treats that outcome as the success it is.
     *
     * <p>Runs in its own transaction so a losing race rolls back cleanly without poisoning the
     * caller's.
     */
    void insert(SavedOpportunity bookmark);

    boolean exists(UUID studentUserId, UUID opportunityId);

    /** Idempotent: returns whether a row was actually removed, never an error when none existed. */
    boolean delete(UUID studentUserId, UUID opportunityId);

    /**
     * One page of the student's bookmarks whose opportunity is CURRENTLY publicly discoverable,
     * newest save first.
     *
     * <p>Visibility is applied inside the SQL, not afterwards in Java, so {@code totalElements} and
     * {@code totalPages} describe what the student can actually see. Filtering a fetched page would
     * produce short pages and dishonest totals.
     */
    Page<SavedOpportunityView> findVisibleByStudent(UUID studentUserId, Pageable pageable);

    /** The subset of {@code opportunityIds} this student has bookmarked, in one query. */
    List<UUID> findSavedOpportunityIds(UUID studentUserId, Collection<UUID> opportunityIds);

    /** One bookmark paired with its opportunity, as the saved list needs both. */
    record SavedOpportunityView(java.time.Instant savedAt, InternshipOpportunity opportunity) {
    }

    /** Test/diagnostic helper: bookmarks for a student regardless of current visibility. */
    Map<UUID, SavedOpportunity> findAllByStudent(UUID studentUserId);
}
