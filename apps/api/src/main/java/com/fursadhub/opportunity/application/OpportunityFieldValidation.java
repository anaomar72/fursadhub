package com.fursadhub.opportunity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.opportunity.domain.OpportunityMode;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;

/**
 * Business-rule validation for opportunity fields (CLAUDE.md section 6) that Bean Validation
 * cannot express (cross-field/date-order rules). Shared by create and edit so both paths enforce
 * the same invariants.
 */
final class OpportunityFieldValidation {

    private OpportunityFieldValidation() {
    }

    static void validate(
            OpportunityMode mode, int numberOfOpenings, LocalDate startDate, LocalDate endDate, LocalDate applicationDeadline) {
        if (numberOfOpenings < 1) {
            throw validationFailed("Number of openings must be at least 1.");
        }
        if (!startDate.isBefore(endDate)) {
            throw validationFailed("Start date must be before end date.");
        }
        if (mode != OpportunityMode.UNIVERSITY_TARGETED && applicationDeadline == null) {
            throw validationFailed("An application deadline is required for this opportunity mode.");
        }
        if (applicationDeadline != null && !applicationDeadline.isBefore(startDate)) {
            throw validationFailed("The application deadline must be before the internship start date.");
        }
    }

    private static ApiException validationFailed(String message) {
        return new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, message);
    }
}
