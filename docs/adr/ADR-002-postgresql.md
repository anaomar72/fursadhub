# ADR-002: PostgreSQL as the Single Source of Truth

## Status

Accepted

## Context

FursadHub's domain has many critical invariants that must never be violated (unique student enrollment numbers per university, exactly one candidacy per opportunity/student pair, exactly one placement per accepted offer, etc.), plus a need for relational integrity across universities, departments, organizations, opportunities, and placements.

## Decision

Use PostgreSQL as the single source of truth for all business data, accessed through Spring Data JPA, with:

- UUID primary keys throughout
- Flyway-only schema migrations — `ddl-auto=update` is never used in staging/production; `ddl-auto=validate` once migrations establish the schema
- critical invariants enforced by PostgreSQL constraints in addition to Java-level checks (e.g. `UNIQUE(university_id, student_number)`, `UNIQUE(opportunity_id, student_id)`)
- `Instant` (stored in UTC) for event timestamps, `LocalDate` for date-only business concepts
- Testcontainers PostgreSQL for integration tests — no H2 as a stand-in for the primary database, so tests exercise real PostgreSQL behavior (constraints, types, transactions)

## Consequences

- One database technology to operate for the pilot, backed by mature tooling (Flyway, Testcontainers, standard Spring Data JPA support).
- Constraints living in the database (not only in application code) give a second line of defense against race conditions and bugs — this matters for invariants like duplicate-candidacy or duplicate-placement prevention under concurrent requests.
- Every schema change requires a migration; there is no implicit schema drift between environments.
- Backups (PostgreSQL) become the primary data-durability mechanism; see the backup/restore requirements in `CLAUDE.md` §67.
