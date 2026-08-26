package com.fursadhub.compliance.application;

import com.fursadhub.administration.application.PlatformAuthorization;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.compliance.domain.PrivacyRequest;
import com.fursadhub.compliance.domain.PrivacyRequestRepository;
import com.fursadhub.compliance.domain.PrivacyRequestState;
import com.fursadhub.compliance.domain.PrivacyRequestType;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.notification.application.NotificationService;
import com.fursadhub.notification.domain.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Data-subject requests, from submission to manual resolution (CLAUDE.md section 50).
 *
 * <p>Two distinct audiences, two distinct authorizations:
 *
 * <ul>
 *   <li>The DATA SUBJECT submits and reads their own requests. The subject is always the
 *       authenticated caller — a user id is never accepted from the browser
 *       (CLAUDE.md section 12) — so nobody can file a request in someone else's name or read theirs.</li>
 *   <li>A SUPER_ADMIN works the queue. Processing is MANUAL, which section 50 explicitly permits for
 *       the pilot: an administrator does the work outside the system and records what was done.
 *       Nothing here deletes or exports data on its own, because an automated ERASURE would happily
 *       destroy records tied to a live placement or an open verification case.</li>
 * </ul>
 */
@Service
public class PrivacyRequestService {

    private final PrivacyRequestRepository requests;
    private final PlatformAuthorization authorization;
    private final UserRepository users;
    private final NotificationService notifications;
    private final AuditService audit;

    public PrivacyRequestService(
            PrivacyRequestRepository requests,
            PlatformAuthorization authorization,
            UserRepository users,
            NotificationService notifications,
            AuditService audit) {
        this.requests = requests;
        this.authorization = authorization;
        this.users = users;
        this.notifications = notifications;
        this.audit = audit;
    }

    // ---------------------------------------------------------------- data subject

    @Transactional
    public PrivacyRequest submit(
            UUID userId, PrivacyRequestType requestType, String details, String ip, String userAgent) {
        PrivacyRequest request = requests.save(PrivacyRequest.submit(userId, requestType, details));

        audit.record("PRIVACY_REQUEST_SUBMITTED", userId, ip, userAgent, requestType.name());
        notifications.notify(userId, NotificationType.PRIVACY_REQUEST_RECEIVED,
                Map.of("requestType", requestType.name()), "/account/privacy", emailOf(userId));
        return request;
    }

    @Transactional(readOnly = true)
    public List<PrivacyRequest> mine(UUID userId) {
        return requests.findByUserIdOrderBySubmittedAtDesc(userId);
    }

    // ---------------------------------------------------------------- administration

    @Transactional(readOnly = true)
    public Page<PrivacyRequest> queue(UUID actingUserId, PrivacyRequestState state, Pageable pageable) {
        authorization.requireSuperAdmin(actingUserId);
        return requests.search(state, pageable);
    }

    @Transactional(readOnly = true)
    public PrivacyRequest get(UUID actingUserId, UUID requestId) {
        authorization.requireSuperAdmin(actingUserId);
        return requireRequest(requestId);
    }

    @Transactional
    public PrivacyRequest beginReview(UUID actingUserId, UUID requestId, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);

        PrivacyRequest request = requireRequest(requestId);
        request.beginReview(actingUserId);
        requests.save(request);

        audit.record("PRIVACY_REQUEST_IN_REVIEW", actingUserId, ip, userAgent, "request " + requestId);
        return request;
    }

    @Transactional
    public PrivacyRequest complete(UUID actingUserId, UUID requestId, String note, String ip, String userAgent) {
        return resolve(actingUserId, requestId, note, true, ip, userAgent);
    }

    /** Rejection must say why: an unexplained refusal is not a resolution the subject can act on. */
    @Transactional
    public PrivacyRequest reject(UUID actingUserId, UUID requestId, String note, String ip, String userAgent) {
        if (note == null || note.isBlank()) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "A reason is required when rejecting a privacy request.");
        }
        return resolve(actingUserId, requestId, note, false, ip, userAgent);
    }

    private PrivacyRequest resolve(
            UUID actingUserId, UUID requestId, String note, boolean completed, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);

        PrivacyRequest request = requireRequest(requestId);
        if (completed) {
            request.complete(actingUserId, note);
        } else {
            request.reject(actingUserId, note);
        }
        requests.save(request);

        audit.record(completed ? "PRIVACY_REQUEST_COMPLETED" : "PRIVACY_REQUEST_REJECTED",
                actingUserId, ip, userAgent, "request " + requestId);
        notifications.notify(
                request.getUserId(),
                completed ? NotificationType.PRIVACY_REQUEST_COMPLETED : NotificationType.PRIVACY_REQUEST_REJECTED,
                Map.of("requestType", request.getRequestType().name()),
                "/account/privacy",
                emailOf(request.getUserId()));
        return request;
    }

    private PrivacyRequest requireRequest(UUID requestId) {
        return requests.findById(requestId)
                .orElseThrow(() -> new ApiException("PRIVACY_REQUEST_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "No such privacy request."));
    }

    private String emailOf(UUID userId) {
        return users.findById(userId).map(User::getEmail).orElse(null);
    }
}
