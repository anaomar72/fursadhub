package com.fursadhub.opportunity.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Hygiene for the opportunity's two authored value lists (Backend Phase B3), exercised through the
 * public entry points {@code OpportunitySkill.from} and {@code OpportunityPerk.from} so the tests
 * bind to the behaviour callers actually get rather than to a package-private helper.
 */
class OpportunityTagListTest {

    private static final UUID OPPORTUNITY = UUID.randomUUID();

    // ---------------------------------------------------------------- normalisation

    @Test
    void surroundingWhitespaceIsTrimmed() {
        assertThat(values(OpportunitySkill.from(OPPORTUNITY, List.of("  Java  ")))).containsExactly("Java");
    }

    /** Internal runs collapse, so "Data  Analysis" cannot exist alongside "Data Analysis". */
    @Test
    void internalWhitespaceIsCollapsed() {
        assertThat(values(OpportunitySkill.from(OPPORTUNITY, List.of("Data   Analysis"))))
                .containsExactly("Data Analysis");
    }

    /** A blank row is an untouched form slot, not an error worth failing the whole save for. */
    @Test
    void blankEntriesAreDroppedRatherThanRejected() {
        assertThat(values(OpportunitySkill.from(OPPORTUNITY, List.of("Java", "   ", "", "SQL"))))
                .containsExactly("Java", "SQL");
    }

    @Test
    void nullEntriesAreDropped() {
        List<String> withNull = new ArrayList<>(Arrays.asList("Java", null, "SQL"));
        assertThat(values(OpportunitySkill.from(OPPORTUNITY, withNull))).containsExactly("Java", "SQL");
    }

    @Test
    void nullAndEmptyListsProduceNoRows() {
        assertThat(OpportunitySkill.from(OPPORTUNITY, null)).isEmpty();
        assertThat(OpportunitySkill.from(OPPORTUNITY, List.of())).isEmpty();
    }

    // ---------------------------------------------------------------- duplicates

    /** Case-insensitive dedupe, keeping the FIRST spelling the author used. */
    @Test
    void duplicatesAreRemovedCaseInsensitivelyKeepingTheFirstSpelling() {
        assertThat(values(OpportunitySkill.from(OPPORTUNITY, List.of("Java", "java", "JAVA"))))
                .containsExactly("Java");
    }

    @Test
    void duplicatesThatDifferOnlyByWhitespaceAreRemoved() {
        assertThat(values(OpportunitySkill.from(OPPORTUNITY, List.of("Data Analysis", "  data   analysis  "))))
                .containsExactly("Data Analysis");
    }

    // ---------------------------------------------------------------- ordering

    /** The author's order is meaningful (most important first) and is what position persists. */
    @Test
    void orderIsPreservedAndPositionsAreGaplessFromZero() {
        List<OpportunitySkill> skills = OpportunitySkill.from(OPPORTUNITY, List.of("React", "  ", "Java", "java", "SQL"));

        assertThat(values(skills)).containsExactly("React", "Java", "SQL");
        assertThat(skills.stream().map(OpportunitySkill::getPosition).toList()).containsExactly(0, 1, 2);
    }

    @Test
    void theNormalizedFormIsStoredAlongsideTheOriginal() {
        OpportunitySkill skill = OpportunitySkill.from(OPPORTUNITY, List.of("Java")).get(0);

        assertThat(skill.getValue()).isEqualTo("Java");
        assertThat(skill.getNormalizedValue()).isEqualTo("java");
        assertThat(skill.getOpportunityId()).isEqualTo(OPPORTUNITY);
    }

    // ---------------------------------------------------------------- caps

    @Test
    void skillCountIsCapped() {
        List<String> tooMany = new ArrayList<>();
        for (int index = 0; index <= OpportunitySkill.MAX_SKILLS_PER_OPPORTUNITY; index++) {
            tooMany.add("Skill " + index);
        }

        assertThatThrownBy(() -> OpportunitySkill.from(OPPORTUNITY, tooMany)).isInstanceOf(ApiException.class);
    }

    /** The cap applies AFTER dedupe — 21 entries that collapse to 20 distinct ones are fine. */
    @Test
    void theCountCapIsAppliedAfterDuplicatesAreRemoved() {
        List<String> withDuplicate = new ArrayList<>();
        for (int index = 0; index < OpportunitySkill.MAX_SKILLS_PER_OPPORTUNITY; index++) {
            withDuplicate.add("Skill " + index);
        }
        withDuplicate.add("SKILL 0");

        assertThat(OpportunitySkill.from(OPPORTUNITY, withDuplicate))
                .hasSize(OpportunitySkill.MAX_SKILLS_PER_OPPORTUNITY);
    }

    @Test
    void skillLengthIsCapped() {
        String tooLong = "x".repeat(OpportunitySkill.MAX_SKILL_LENGTH + 1);

        assertThatThrownBy(() -> OpportunitySkill.from(OPPORTUNITY, List.of(tooLong)))
                .isInstanceOf(ApiException.class);
    }

    /** Length is measured after trimming, so padding does not push a legal value over the cap. */
    @Test
    void lengthIsMeasuredAfterTrimming() {
        String exact = "x".repeat(OpportunitySkill.MAX_SKILL_LENGTH);

        assertThat(values(OpportunitySkill.from(OPPORTUNITY, List.of("  " + exact + "  ")))).containsExactly(exact);
    }

    // ---------------------------------------------------------------- perks share the rules

    @Test
    void perksGetIdenticalTreatment() {
        List<OpportunityPerk> perks = OpportunityPerk.from(
                OPPORTUNITY, List.of("  Mentorship  ", "mentorship", "", "Transport   allowance"));

        assertThat(perks.stream().map(OpportunityPerk::getValue).toList())
                .containsExactly("Mentorship", "Transport allowance");
        assertThat(perks.stream().map(OpportunityPerk::getPosition).toList()).containsExactly(0, 1);
    }

    @Test
    void perkCountIsCapped() {
        List<String> tooMany = new ArrayList<>();
        for (int index = 0; index <= OpportunityPerk.MAX_PERKS_PER_OPPORTUNITY; index++) {
            tooMany.add("Perk " + index);
        }

        assertThatThrownBy(() -> OpportunityPerk.from(OPPORTUNITY, tooMany)).isInstanceOf(ApiException.class);
    }

    @Test
    void perkLengthIsCapped() {
        String tooLong = "x".repeat(OpportunityPerk.MAX_PERK_LENGTH + 1);

        assertThatThrownBy(() -> OpportunityPerk.from(OPPORTUNITY, List.of(tooLong)))
                .isInstanceOf(ApiException.class);
    }

    private static List<String> values(List<OpportunitySkill> skills) {
        return skills.stream().map(OpportunitySkill::getValue).toList();
    }
}
