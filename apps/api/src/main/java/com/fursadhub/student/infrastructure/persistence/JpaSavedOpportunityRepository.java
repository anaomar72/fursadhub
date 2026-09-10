package com.fursadhub.student.infrastructure.persistence;

import com.fursadhub.student.domain.SavedOpportunity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

interface JpaSavedOpportunityRepository extends JpaRepository<SavedOpportunity, UUID> {

    boolean existsByStudentUserIdAndOpportunityId(UUID studentUserId, UUID opportunityId);

    List<SavedOpportunity> findByStudentUserId(UUID studentUserId);

    /** Returns the number of rows removed, which is what makes unsave idempotent rather than an error. */
    @Modifying
    int deleteByStudentUserIdAndOpportunityId(UUID studentUserId, UUID opportunityId);

    /**
     * The saved ids among the supplied candidates — one query for a whole page of cards, never one
     * per card. Selecting only the id keeps this a lightweight lookup that exposes no opportunity
     * data.
     */
    @Query("SELECT s.opportunityId FROM SavedOpportunity s "
            + "WHERE s.studentUserId = :studentUserId AND s.opportunityId IN :opportunityIds")
    List<UUID> findSavedOpportunityIds(
            @Param("studentUserId") UUID studentUserId, @Param("opportunityIds") Collection<UUID> opportunityIds);
}
