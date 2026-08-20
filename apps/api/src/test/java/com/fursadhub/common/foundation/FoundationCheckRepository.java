package com.fursadhub.common.foundation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FoundationCheckRepository extends JpaRepository<FoundationCheckEntity, UUID> {
}
