package com.fursadhub.common.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Polls the PostgreSQL-backed outbox and attempts delivery, retrying failures on the next tick.
 * A stopped/unreachable SMTP server therefore never blocks or rolls back the business transaction
 * that enqueued the message (CLAUDE.md section 55) — never log message bodies, they may contain
 * verification/reset links (CLAUDE.md section 68 — no secrets in logs).
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
        List<EmailOutboxMessage> pending = repository.findTop50ByStatusOrderByCreatedAtAsc(EmailOutboxStatus.PENDING);
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
