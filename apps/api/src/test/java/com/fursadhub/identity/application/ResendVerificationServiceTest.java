package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.config.AuthProperties;
import com.fursadhub.common.ratelimit.InMemoryRateLimiter;
import com.fursadhub.identity.domain.UserRepository;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Fast, Spring-context-free coverage of resend cooldown/rate-limiting (CLAUDE.md section 13) —
 * uses a real {@link InMemoryRateLimiter} (it's a plain in-memory utility) so timing behavior is
 * exercised for real, without needing a database or waiting out the production 60s cooldown in
 * every test run (each test configures its own short-but-real {@link Duration}).
 */
class ResendVerificationServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final IssueEmailVerificationTokenService issuer = mock(IssueEmailVerificationTokenService.class);

    @Test
    void secondResendWithinCooldownIsRateLimited() {
        ResendVerificationService service = service(Duration.ofSeconds(60));

        service.resend("student@example.test");

        assertThatThrownBy(() -> service.resend("student@example.test"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("RATE_LIMITED");
    }

    @Test
    void resendSucceedsAgainAfterCooldownExpires() throws InterruptedException {
        ResendVerificationService service = service(Duration.ofMillis(50));

        service.resend("student@example.test");
        Thread.sleep(100);
        service.resend("student@example.test");

        // Reaching here without an exception proves neither call was cooldown-blocked; verifying
        // findByEmail ran twice confirms both calls actually passed the rate-limit checks.
        verify(users, atLeast(2)).findByEmail(any());
    }

    @Test
    void maxResendsPerHourIsEnforcedOnceCooldownIsOutOfTheWay() throws InterruptedException {
        // A zero cooldown (plus a small real sleep between calls to guarantee the sliding window
        // actually evicts) isolates the separate 5-per-hour cap from the 60s cooldown check.
        ResendVerificationService service = service(Duration.ZERO);

        for (int i = 0; i < 5; i++) {
            service.resend("student@example.test");
            Thread.sleep(2);
        }

        assertThatThrownBy(() -> service.resend("student@example.test"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("RATE_LIMITED");
    }

    @Test
    void doesNotLeakWhetherTheEmailIsRegistered() {
        ResendVerificationService service = service(Duration.ofSeconds(60));
        when(users.findByEmail(any())).thenReturn(java.util.Optional.empty());

        service.resend("unknown@example.test");

        verify(issuer, never()).issueAndSend(any());
    }

    private ResendVerificationService service(Duration cooldown) {
        AuthProperties authProperties = new AuthProperties(Duration.ofDays(30), Duration.ofMinutes(10), Duration.ofHours(1), cooldown);
        return new ResendVerificationService(users, issuer, new InMemoryRateLimiter(), authProperties);
    }
}
