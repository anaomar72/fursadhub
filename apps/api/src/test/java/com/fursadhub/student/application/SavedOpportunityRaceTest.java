package com.fursadhub.student.application;

import com.fursadhub.opportunity.application.PublicOpportunityQueryService;
import com.fursadhub.student.domain.SavedOpportunity;
import com.fursadhub.student.domain.SavedOpportunityRepository;
import com.fursadhub.student.domain.StudentProfile;
import com.fursadhub.student.domain.StudentProfileRepository;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Which integrity failures the idempotent save is allowed to treat as success (Backend Phase B4).
 *
 * <p>The duplicate-bookmark race must become a silent no-op, because the end state is exactly what
 * the caller asked for. Every OTHER integrity failure must propagate: answering
 * {@code 204 No Content} to a request that stored nothing would tell the client it succeeded while
 * the bookmark quietly does not exist.
 *
 * <p>A unit test with a mocked repository rather than an integration test, because provoking a
 * foreign-key violation at exactly the right moment against a real database is a race that cannot be
 * scheduled reliably — whereas the decision under test is entirely about how one exception is
 * classified.
 */
class SavedOpportunityRaceTest {

    private static final UUID STUDENT = UUID.randomUUID();
    private static final UUID OPPORTUNITY = UUID.randomUUID();

    private SavedOpportunityRepository savedOpportunities;
    private SavedOpportunityService service;

    @BeforeEach
    void setUp() {
        savedOpportunities = mock(SavedOpportunityRepository.class);
        StudentProfileRepository profiles = mock(StudentProfileRepository.class);
        PublicOpportunityQueryService publicOpportunities = mock(PublicOpportunityQueryService.class);

        when(profiles.findByUserId(STUDENT)).thenReturn(Optional.of(mock(StudentProfile.class)));
        when(savedOpportunities.exists(STUDENT, OPPORTUNITY)).thenReturn(false);

        service = new SavedOpportunityService(savedOpportunities, profiles, publicOpportunities);
    }

    /** The expected race: another request inserted the same bookmark first. */
    @Test
    void aDuplicateBookmarkViolationIsTreatedAsSuccess() {
        doThrow(violation(SavedOpportunity.UNIQUE_CONSTRAINT))
                .when(savedOpportunities).insert(any());

        assertThatCode(() -> service.save(STUDENT, OPPORTUNITY)).doesNotThrowAnyException();
    }

    /** Constraint names are compared case-insensitively; PostgreSQL folds identifiers. */
    @Test
    void theConstraintNameIsMatchedCaseInsensitively() {
        doThrow(violation(SavedOpportunity.UNIQUE_CONSTRAINT.toUpperCase(java.util.Locale.ROOT)))
                .when(savedOpportunities).insert(any());

        assertThatCode(() -> service.save(STUDENT, OPPORTUNITY)).doesNotThrowAnyException();
    }

    /**
     * A foreign-key failure — the opportunity or the account deleted between the visibility check
     * and the insert — stored nothing, so it must NOT be reported as a successful save.
     */
    @Test
    void aForeignKeyViolationPropagatesRatherThanBecomingASilentSuccess() {
        doThrow(violation("fk_student_saved_opportunities_opportunity"))
                .when(savedOpportunities).insert(any());

        assertThatThrownBy(() -> service.save(STUDENT, OPPORTUNITY))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void anUnrelatedCheckViolationPropagates() {
        doThrow(violation("ck_some_other_rule")).when(savedOpportunities).insert(any());

        assertThatThrownBy(() -> service.save(STUDENT, OPPORTUNITY))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /**
     * With no constraint name available, the fallback asks the only question that settles it: is the
     * bookmark actually there now? If it is, the race happened and this is success.
     */
    @Test
    void withoutAConstraintNameTheStoredStateDecides() {
        doThrow(new DataIntegrityViolationException("no constraint name"))
                .when(savedOpportunities).insert(any());
        when(savedOpportunities.exists(STUDENT, OPPORTUNITY)).thenReturn(false, true);

        assertThatCode(() -> service.save(STUDENT, OPPORTUNITY)).doesNotThrowAnyException();
    }

    @Test
    void withoutAConstraintNameAndNoStoredBookmarkTheFailurePropagates() {
        doThrow(new DataIntegrityViolationException("no constraint name"))
                .when(savedOpportunities).insert(any());
        when(savedOpportunities.exists(STUDENT, OPPORTUNITY)).thenReturn(false, false);

        assertThatThrownBy(() -> service.save(STUDENT, OPPORTUNITY))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /** The ordinary repeat click never reaches the insert at all. */
    @Test
    void anAlreadySavedBookmarkShortCircuitsBeforeInserting() {
        when(savedOpportunities.exists(STUDENT, OPPORTUNITY)).thenReturn(true);

        service.save(STUDENT, OPPORTUNITY);

        verify(savedOpportunities, never()).insert(any());
        assertThat(true).isTrue();
    }

    /** Mirrors how Spring surfaces a PostgreSQL constraint failure: Hibernate's exception as the cause. */
    private static DataIntegrityViolationException violation(String constraintName) {
        ConstraintViolationException hibernate = new ConstraintViolationException(
                "constraint violation", new SQLException("duplicate key", "23505"), constraintName);
        return new DataIntegrityViolationException("could not execute statement", hibernate);
    }
}
