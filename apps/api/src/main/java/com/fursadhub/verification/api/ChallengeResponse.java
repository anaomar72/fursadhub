package com.fursadhub.verification.api;

import com.fursadhub.verification.application.IssueVerificationChallengeService;

public record ChallengeResponse(String code, String expiresAt) {

    public static ChallengeResponse from(IssueVerificationChallengeService.IssuedChallenge issued) {
        return new ChallengeResponse(issued.code(), issued.expiresAt().toString());
    }
}
