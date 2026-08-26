package com.fursadhub.compliance.api;

import com.fursadhub.compliance.domain.ConsentRecord;

import java.time.Instant;

public record ConsentResponse(String consentType, boolean granted, Instant grantedAt, Instant withdrawnAt) {

    public static ConsentResponse from(ConsentRecord record) {
        return new ConsentResponse(
                record.getConsentType().name(),
                record.isGranted(),
                record.getGrantedAt(),
                record.getWithdrawnAt());
    }
}
