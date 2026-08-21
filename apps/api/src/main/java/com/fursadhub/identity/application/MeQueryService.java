package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Resolves the current user from PostgreSQL rather than trusting JWT claims alone (CLAUDE.md
 * section 15: "current resource authorization must use current PostgreSQL data").
 */
@Service
public class MeQueryService {

    private final UserRepository users;

    public MeQueryService(UserRepository users) {
        this.users = users;
    }

    public User getById(UUID id) {
        return users.findById(id)
                .orElseThrow(() -> new ApiException("UNAUTHORIZED", HttpStatus.UNAUTHORIZED, "Authentication is required to access this resource."));
    }
}
