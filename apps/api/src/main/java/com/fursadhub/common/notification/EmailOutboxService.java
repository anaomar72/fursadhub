package com.fursadhub.common.notification;

import org.springframework.stereotype.Service;

import java.util.UUID;

/** Enqueues transactional email; callers invoke this within their own business transaction. */
@Service
public class EmailOutboxService {

    private final EmailOutboxRepository repository;

    public EmailOutboxService(EmailOutboxRepository repository) {
        this.repository = repository;
    }

    public void enqueue(String toEmail, String subject, String body) {
        repository.save(new EmailOutboxMessage(UUID.randomUUID(), toEmail, subject, body));
    }
}
