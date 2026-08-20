# FursadHub

FursadHub is an internship-management SaaS platform, initially focused on Somalia and piloted with Jamhuriya University. It connects students, universities, and organizations through one unified internship pipeline: sourcing, recruitment, placement, supervision, reporting, evaluation, defense, and completion.

See [`CLAUDE.md`](./CLAUDE.md) for the full engineering contract and [`docs/CLAUDE_IMPLEMENTATION_PHASES.md`](./docs/CLAUDE_IMPLEMENTATION_PHASES.md) for the implementation sequence.

## Architecture

FursadHub is a **modular monolith** during the pilot: one React application, one Spring Boot application, one PostgreSQL database.

```text
React Web Application
        |
        | HTTPS / REST
        v
Spring Boot API
        |
        +---- PostgreSQL
        |
        +---- Private S3-compatible object storage
        |
        +---- Email / notification provider
```

See [`docs/architecture/overview.md`](./docs/architecture/overview.md) and [`docs/architecture/REPOSITORY_STRUCTURE.md`](./docs/architecture/REPOSITORY_STRUCTURE.md).

## Stack

- **Backend:** Java 21, Spring Boot, Spring Security, Spring Data JPA, PostgreSQL, Flyway, Maven
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, react-i18next
- **Testing:** JUnit / Spring Boot Test / Testcontainers (backend), Vitest / React Testing Library (frontend), Playwright (e2e)
- **Infra:** Docker, Docker Compose, GitHub Actions

## Repository layout

```text
apps/api      Spring Boot backend
apps/web      React frontend
e2e/          Playwright end-to-end tests
infra/        Local/staging/production infrastructure (Docker Compose, etc.)
docs/         Architecture, product, and ADR documentation
```

## Local development

### Prerequisites

- Java 21
- Node.js 20+
- Docker and Docker Compose

### 1. Start local infrastructure

```bash
cp .env.example .env
docker compose -f infra/compose.yaml up -d
```

This starts PostgreSQL, a local S3-compatible object store (MinIO), and a local mail catcher (MailDev).

### 2. Run the backend

```bash
cd apps/api
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

The API is served at `http://localhost:8080`, business endpoints under `/api/v1`, OpenAPI UI at `/docs`, health at `/actuator/health`.

### 3. Run the frontend

```bash
cd apps/web
npm ci
npm run dev
```

The app is served at `http://localhost:5173`.

## Testing

```bash
# Backend (unit + Testcontainers integration tests)
cd apps/api && ./mvnw verify

# Frontend
cd apps/web && npm run lint && npm run typecheck && npm run test && npm run build

# End-to-end
cd e2e && npm ci && npx playwright test
```

## Security

See [`SECURITY.md`](./SECURITY.md) for the authentication/authorization model and how to report a vulnerability.
