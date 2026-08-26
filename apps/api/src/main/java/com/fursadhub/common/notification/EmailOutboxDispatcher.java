package com.fursadhub.common.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Polls the PostgreSQL-backed outbox and attempts delivery. A stopped or unreachable SMTP server
 * therefore never blocks or rolls back the business transaction that enqueued the message
 * (CLAUDE.md section 55) — never log message bodies, they may contain verification/reset links
 * (CLAUDE.md section 68 — no secrets in logs).
 *
 * <p>Since Phase 7 a failed message is not retried on the very next tick: it carries a
 * {@code nextAttemptAt} that backs off five-fold each time, so its five attempts span hours rather
 * than seconds and a brief provider outage no longer exhausts them all.
 */
@Component
public class EmailOutboxDispatcher {

    private static final Logger log = LoggerFactory.getLogger(EmailOutboxDispatcher.class);

    private final EmailOutboxRepository repository;
    private final JavaMailSender mailSender;
    private final NotificationProperties properties;

    public EmailOutboxDispatcher(EmailOutboxRepository repository, JavaMailSender mailSender, NotificationProperties properties) {
        this.repository = repository;
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "PT10S", initialDelayString = "PT5S")
    @Transactional
    public void dispatchPending() {
        List<EmailOutboxMessage> pending = repository
                .findTop50ByStatusAndNextAttemptAtBeforeOrderByNextAttemptAtAsc(EmailOutboxStatus.PENDING, Instant.now());
        for (EmailOutboxMessage message : pending) {
            send(message);
        }
    }

    private void send(EmailOutboxMessage message) {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom(properties.fromAddress());
            mailMessage.setTo(message.getToEmail());
            mailMessage.setSubject(message.getSubject());
            mailMessage.setText(message.getBody());
            mailSender.send(mailMessage);
            message.markSent();
        } catch (MailException e) {
            log.warn("Failed to deliver outbox message {} (attempt {}): {}", message.getId(), message.getAttempts() + 1, e.getMessage());
            message.markAttemptFailed(e.getClass().getSimpleName());
        }
    }
}
