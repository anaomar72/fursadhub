package com.fursadhub.notification.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository {

    Notification save(Notification notification);

    Optional<Notification> findById(UUID id);

    Page<Notification> findByUserId(UUID userId, Pageable pageable);

    Page<Notification> findUnreadByUserId(UUID userId, Pageable pageable);

    long countUnreadByUserId(UUID userId);

    List<Notification> findUnreadForUpdate(UUID userId);
}
