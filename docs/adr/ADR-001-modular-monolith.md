# ADR-001: Modular Monolith Architecture

## Status

Accepted

## Context

FursadHub is launching a pilot at one university (Jamhuriya University) in one market (Somalia) with no proven scale requirements yet. The domain has many bounded concepts (identity, university, organization, verification, opportunity, candidacy, placement, internship management, files, notifications, compliance, administration), which creates pressure to reach for microservices prematurely.

## Decision

Build FursadHub as a single Spring Boot application, a single React application, and a single PostgreSQL database — a **modular monolith**. Bounded domains are separated by Java package boundaries (`identity`, `university`, `organization`, `opportunity`, `candidacy`, `placement`, `internshipmanagement`, `file`, `notification`, `compliance`, `administration`, `common`), each following the `api / application / domain / infrastructure` layering, rather than by network/service boundaries.

Do not introduce microservices, Kafka, RabbitMQ, Kubernetes, Redis, GraphQL, Elasticsearch, WebSockets, or generic workflow/permission/form-builder engines without explicit approval from the FursadHub team.

## Consequences

- Single deployable backend and frontend simplify local development, CI, and pilot-stage operations.
- Module boundaries are enforced by code review and package structure, not by the runtime — discipline is required to avoid boundaries eroding into a single global `controller/service/repository/entity` tree.
- A single PostgreSQL database means cross-module joins are possible but should be used judiciously; each module owns its own tables conceptually.
- If FursadHub later needs to scale a specific capability independently, the module boundaries established here make future extraction easier, but extraction itself is out of scope until a concrete, demonstrated need exists.
