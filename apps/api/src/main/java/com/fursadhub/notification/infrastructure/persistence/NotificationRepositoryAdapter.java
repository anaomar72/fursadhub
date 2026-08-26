package com.fursadhub.notification.infrastructure.persistence;

import com.fursadhub.notification.domain.Notification;
import com.fursadhub.notification.domain.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class NotificationRepositoryAdapter implements NotificationRepository {

    private final JpaNotificationRepository jpaRepository;

    NotificationRepositoryAdapter(JpaNotificationRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Notification save(Notification notification) {
        return jpaRepository.save(notification);
    }

    @Override
    public Optional<Notification> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Page<Notification> findByUserId(UUID userId, Pageable pageable) {
        return jpaRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Override
    public Page<Notification> findUnreadByUserId(UUID userId, Pageable pageable) {
        return jpaRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, pageable);
    }

    @Override
    public long countUnreadByUserId(UUID userId) {
        return jpaRepository.countByUserIdAndReadAtIsNull(userId);
    }

    @Override
    public List<Notification> findUnreadForUpdate(UUID userId) {
        return jpaRepository.findUnread(userId);
    }
}
