package com.fursadhub.opportunity.domain;

/**
 * The closed set of screening-question types (CLAUDE.md Phase 4 section 9). FursadHub deliberately
 * does NOT build a generic dynamic-form engine — adding a type here is a product decision, not a
 * configuration change, and requires explicit approval.
 */
public enum ScreeningQuestionType {
    SHORT_TEXT,
    LONG_TEXT,
    YES_NO,
    SINGLE_CHOICE
}
