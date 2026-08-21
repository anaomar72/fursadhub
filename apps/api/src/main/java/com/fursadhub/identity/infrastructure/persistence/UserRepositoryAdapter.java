package com.fursadhub.identity.infrastructure.persistence;

import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
class UserRepositoryAdapter implements UserRepository {

    private final JpaUserRepository jpaRepository;

    UserRepositoryAdapter(JpaUserRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public User save(User user) {
        return jpaRepository.save(user);
    }

    @Override
    public Optional<User> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<User> findByEmail(String normalizedEmail) {
        return jpaRepository.findByEmail(normalizedEmail);
    }

    @Override
    public boolean existsByEmail(String normalizedEmail) {
        return jpaRepository.existsByEmail(normalizedEmail);
    }
}
