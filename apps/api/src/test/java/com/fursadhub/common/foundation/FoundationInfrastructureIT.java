package com.fursadhub.common.foundation;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the Phase 0 engineering foundation end to end:
 * 1) a real PostgreSQL container starts,
 * 2) Flyway runs against it and creates the schema,
 * 3) Spring Boot connects and the context loads,
 * 4) a migration-backed JPA read/write round-trips correctly.
 *
 * Deliberately uses Testcontainers PostgreSQL rather than H2 (see CLAUDE.md section 59).
 */
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class FoundationInfrastructureIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("fursadhub_test")
            .withUsername("fursadhub_test")
            .withPassword("fursadhub_test");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private FoundationCheckRepository repository;

    @Test
    void flywayMigratedSchemaSupportsReadAndWrite() {
        FoundationCheckEntity saved = repository.save(
                new FoundationCheckEntity(UUID.randomUUID(), "phase-0-foundation-proof", Instant.now()));

        Optional<FoundationCheckEntity> found = repository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getNote()).isEqualTo("phase-0-foundation-proof");
    }
}
