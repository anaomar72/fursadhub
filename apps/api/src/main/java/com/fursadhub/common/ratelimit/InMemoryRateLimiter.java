package com.fursadhub.common.ratelimit;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Single-instance sliding-window rate limiter for login/forgot-password/resend-verification
 * abuse prevention (CLAUDE.md section 21/61). FursadHub is a modular monolith with exactly one
 * API instance during the pilot, so an in-memory limiter is sufficient; do not introduce Redis
 * for this until the platform actually runs more than one instance (CLAUDE.md section 21).
 */
@Component
public class InMemoryRateLimiter {

    private final ConcurrentHashMap<String, Deque<Instant>> attemptsByKey = new ConcurrentHashMap<>();

    /** Returns true and records an attempt if the caller is still within the allowed rate; false if the limit is exceeded. */
    public boolean tryConsume(String key, int maxAttempts, Duration window) {
        Instant now = Instant.now();
        Deque<Instant> attempts = attemptsByKey.computeIfAbsent(key, k -> new ArrayDeque<>());

        synchronized (attempts) {
            while (!attempts.isEmpty() && attempts.peekFirst().isBefore(now.minus(window))) {
                attempts.pollFirst();
            }
            if (attempts.size() >= maxAttempts) {
                return false;
            }
            attempts.addLast(now);
            return true;
        }
    }
}
