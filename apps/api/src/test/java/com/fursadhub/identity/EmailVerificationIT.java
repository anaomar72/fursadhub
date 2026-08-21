package com.fursadhub.identity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Covers the 4-digit email-verification code flow (CLAUDE.md section 13): generation, delivery,
 * correct/incorrect/expired/replayed codes, the per-challenge failed-attempt cap, and resend
 * cooldown/invalidation semantics.
 */
class EmailVerificationIT extends AbstractIdentityIT {

    @Test
    void registrationGeneratesAFourDigitCodeDeliveredByEmail() {
        String email = uniqueEmail("verify-generate");
        register(email, "Password123");

        String code = latestVerificationCodeFor(email);

        assertThat(code).matches("\\d{4}");
    }

    @Test
    void correctCodeVerifiesAndActivatesAccount() {
        String email = uniqueEmail("verify-success");
        register(email, "Password123");
        String code = latestVerificationCodeFor(email);

        ResponseEntity<Map> response = verifyEmailCode(email, code);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        String accessToken = loginAndExtractAccessToken(email, "Password123");
        ResponseEntity<Map> me = getMe(accessToken);
        assertThat(me.getBody().get("emailVerifiedAt")).isNotNull();
    }

    @Test
    void leadingZeroCodeSucceeds() {
        String email = uniqueEmail("verify-leading-zero");
        register(email, "Password123");
        overrideActiveVerificationCode(email, "0007");

        ResponseEntity<Map> response = verifyEmailCode(email, "0007");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void wrongCodeIsRejected() {
        String email = uniqueEmail("verify-wrong");
        register(email, "Password123");
        String code = latestVerificationCodeFor(email);
        String wrongCode = code.equals("0000") ? "1111" : "0000";

        ResponseEntity<Map> response = verifyEmailCode(email, wrongCode);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("EMAIL_VERIFICATION_CODE_INVALID");
    }

    @Test
    void expiredCodeIsRejected() {
        String email = uniqueEmail("verify-expired");
        register(email, "Password123");
        String code = latestVerificationCodeFor(email);
        expireEmailVerificationCode(email);

        ResponseEntity<Map> response = verifyEmailCode(email, code);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("EMAIL_VERIFICATION_CODE_EXPIRED");
    }

    @Test
    void consumedCodeCannotBeReplayed() {
        String email = uniqueEmail("verify-replay");
        register(email, "Password123");
        String code = latestVerificationCodeFor(email);

        ResponseEntity<Map> first = verifyEmailCode(email, code);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> replay = verifyEmailCode(email, code);

        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(replay.getBody().get("code")).isEqualTo("EMAIL_VERIFICATION_CODE_INVALID");
    }

    @Test
    void invalidVerificationCodeFormatIsRejected() {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/email/verify"), Map.of("email", uniqueEmail("verify-bad-format"), "code", "12"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void maxFailedAttemptsLocksTheChallenge() {
        String email = uniqueEmail("verify-locked");
        register(email, "Password123");
        String code = latestVerificationCodeFor(email);
        String wrongCode = code.equals("0000") ? "1111" : "0000";

        for (int i = 0; i < 5; i++) {
            ResponseEntity<Map> attempt = verifyEmailCode(email, wrongCode);
            assertThat(attempt.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

        ResponseEntity<Map> lockedEvenWithCorrectCode = verifyEmailCode(email, code);

        assertThat(lockedEvenWithCorrectCode.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(lockedEvenWithCorrectCode.getBody().get("code")).isEqualTo("EMAIL_VERIFICATION_CODE_LOCKED");
    }

    @Test
    void resendInvalidatesPreviousCode() {
        String email = uniqueEmail("verify-resend-invalidate");
        register(email, "Password123");
        String firstCode = latestVerificationCodeFor(email);

        ResponseEntity<Map> resend = resendVerification(email);
        assertThat(resend.getStatusCode()).isEqualTo(HttpStatus.OK);
        String secondCode = latestVerificationCodeFor(email);

        ResponseEntity<Map> withOldCode = verifyEmailCode(email, firstCode);
        assertThat(withOldCode.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(withOldCode.getBody().get("code")).isEqualTo("EMAIL_VERIFICATION_CODE_INVALID");

        ResponseEntity<Map> withNewCode = verifyEmailCode(email, secondCode);
        assertThat(withNewCode.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void secondResendWithinCooldownIsRateLimited() {
        String email = uniqueEmail("verify-resend-cooldown");
        register(email, "Password123");

        ResponseEntity<Map> first = resendVerification(email);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> second = resendVerification(email);

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(second.getBody().get("code")).isEqualTo("RATE_LIMITED");
    }

    @Test
    void resendForUnknownEmailDoesNotLeakExistence() {
        ResponseEntity<Map> response = resendVerification(uniqueEmail("verify-unknown"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
