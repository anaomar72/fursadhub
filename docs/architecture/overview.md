# Architecture Overview

## System shape

FursadHub is a **modular monolith** for the pilot: one Spring Boot API, one React application, one PostgreSQL database.

```text
React Web Application (apps/web)
        |
        | HTTPS / REST, JSON, /api/v1
        v
Spring Boot API (apps/api)
        |
        +---- PostgreSQL            (source of truth, Flyway-migrated)
        |
        +---- Private S3-compatible object storage   (documents, evidence)
        |
        +---- Email / notification provider           (outbox pattern)
```

Rationale: see [`docs/adr/ADR-001-modular-monolith.md`](../adr/ADR-001-modular-monolith.md).

## Backend module boundaries

The backend is organized as bounded modules under `com.fursadhub`, not one global `controller/service/repository/entity` tree:

```text
common
identity
student
university
organization
verification
opportunity
candidacy
placement
internshipmanagement
file
notification
compliance
administration
```

Each meaningful module follows the same internal layering:

```text
feature/
├── api/              REST controllers, request/response DTOs — HTTP concerns only
├── application/      use cases, transaction orchestration
├── domain/           entities, value objects, enums, invariants, repository interfaces
└── infrastructure/   JPA/persistence, object storage, email, external providers
```

JPA entities are never returned directly from REST controllers; controllers map to/from DTOs.

## Frontend structure

```text
apps/web/src/
├── app/              router, providers, layouts, config — application shell
├── features/         one directory per bounded feature (api/components/hooks/pages/schemas/types)
├── components/ui/    generic, feature-agnostic UI primitives only
├── lib/               api client, auth store, i18n, validation helpers, utils
├── locales/          en/, so/ translation bundles
└── assets/brand/      approved FursadHub logo/brand assets
```

Server state (API data) lives in TanStack Query; global client state is kept minimal (the in-memory auth/session state only). See [`docs/architecture/REPOSITORY_STRUCTURE.md`](./REPOSITORY_STRUCTURE.md) for the full tree and the frontend feature convention.

## Cross-cutting foundations (Phase 0)

- **API errors:** every error response is the stable `ApiError` contract (`code`, `message`, `status`, `path`, `timestamp`, `fieldErrors`) via `GlobalExceptionHandler`. Frontend code branches on `code`, never on `message`.
- **Correlation IDs:** `CorrelationIdFilter` assigns/propagates `X-Request-Id` so every log line for a request is traceable end to end; the header is echoed back to the caller.
- **Safe logging:** `logback-spring.xml` includes the correlation id in every line and never logs request/response bodies, headers, or secrets (CLAUDE.md §68).
- **Security baseline:** stateless session policy, controlled CORS, Actuator restricted to `health`/`info`. Real JWT validation (OAuth2 Resource Server) and cookie-based refresh/CSRF protection are wired in Phase 1 once real signing keys and the auth business flow exist — see [`ADR-003`](../adr/ADR-003-jwt-authentication.md).
- **Database:** PostgreSQL is the single source of truth, UUID primary keys, Flyway-only schema changes, `ddl-auto=validate`. Critical invariants get both a Java-level check and a PostgreSQL constraint.

## Environments

```text
LOCAL       apps run on host, dependencies via infra/compose.yaml
CI          GitHub Actions — compile/test/build, Testcontainers PostgreSQL
STAGING     auto-deploys from main, synthetic data only
PRODUCTION  requires explicit human approval
```

## Explicitly out of scope for the pilot

Microservices, Kafka/RabbitMQ, Kubernetes, Redis, GraphQL, Elasticsearch, WebSockets, generic workflow/permission/form-builder engines, biometric verification, and real payment processing are not introduced unless the FursadHub team explicitly requests the change (CLAUDE.md §3, §69–72).
