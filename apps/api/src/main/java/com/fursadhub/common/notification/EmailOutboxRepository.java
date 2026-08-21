package com.fursadhub.common.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EmailOutboxRepository extends JpaRepository<EmailOutboxMessage, UUID> {

    List<EmailOutboxMessage> findTop50ByStatusOrderByCreatedAtAsc(EmailOutboxStatus status);

    List<EmailOutboxMessage> findByToEmailOrderByCreatedAtDesc(String toEmail);
}
