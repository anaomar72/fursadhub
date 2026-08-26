package com.fursadhub.common.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface EmailOutboxRepository extends JpaRepository<EmailOutboxMessage, UUID> {

    List<EmailOutboxMessage> findTop50ByStatusOrderByCreatedAtAsc(EmailOutboxStatus status);

    /**
     * The dispatcher's query since Phase 7: pending messages whose backoff has elapsed. A message
     * that failed a moment ago is skipped until its {@code nextAttemptAt} passes, instead of being
     * retried on every 10-second tick.
     */
    List<EmailOutboxMessage> findTop50ByStatusAndNextAttemptAtBeforeOrderByNextAttemptAtAsc(
            EmailOutboxStatus status, Instant now);

    List<EmailOutboxMessage> findByToEmailOrderByCreatedAtDesc(String toEmail);

    /** Delivery-failure counter for the admin console's operational statistics. */
    long countByStatus(EmailOutboxStatus status);
}
