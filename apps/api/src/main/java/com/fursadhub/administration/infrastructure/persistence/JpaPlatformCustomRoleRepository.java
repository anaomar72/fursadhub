package com.fursadhub.administration.infrastructure.persistence;

import com.fursadhub.administration.domain.PlatformCustomRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface JpaPlatformCustomRoleRepository extends JpaRepository<PlatformCustomRole, UUID> {
}
