package com.fursadhub.organization.infrastructure.persistence;

import com.fursadhub.organization.domain.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface JpaOrganizationRepository extends JpaRepository<Organization, UUID> {

    boolean existsBySlug(String slug);
}
