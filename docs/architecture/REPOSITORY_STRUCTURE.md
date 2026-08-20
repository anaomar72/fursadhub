# FursadHub Repository Structure

This document defines the target monorepo structure.

Do not create empty placeholder classes simply to make the tree look complete. The repository should grow phase by phase.

```text
fursadhub/
│
├── apps/
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── java/
│   │   │   │   │   └── com/fursadhub/
│   │   │   │   │       ├── FursadHubApplication.java
│   │   │   │   │       ├── common/
│   │   │   │   │       ├── identity/
│   │   │   │   │       ├── student/
│   │   │   │   │       ├── university/
│   │   │   │   │       ├── organization/
│   │   │   │   │       ├── verification/
│   │   │   │   │       ├── opportunity/
│   │   │   │   │       ├── candidacy/
│   │   │   │   │       ├── placement/
│   │   │   │   │       ├── internshipmanagement/
│   │   │   │   │       ├── file/
│   │   │   │   │       ├── notification/
│   │   │   │   │       ├── compliance/
│   │   │   │   │       └── administration/
│   │   │   │   │
│   │   │   │   └── resources/
│   │   │   │       ├── application.yml
│   │   │   │       ├── application-local.yml
│   │   │   │       ├── application-test.yml
│   │   │   │       ├── application-staging.yml
│   │   │   │       ├── application-production.yml
│   │   │   │       └── db/
│   │   │   │           └── migration/
│   │   │   │
│   │   │   └── test/
│   │   │       └── java/com/fursadhub/
│   │   │
│   │   ├── pom.xml
│   │   ├── mvnw
│   │   ├── mvnw.cmd
│   │   ├── Dockerfile
│   │   └── .dockerignore
│   │
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── router/
│       │   │   ├── providers/
│       │   │   ├── layouts/
│       │   │   └── config/
│       │   │
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   ├── student/
│       │   │   ├── university/
│       │   │   ├── organization/
│       │   │   ├── verification/
│       │   │   ├── opportunities/
│       │   │   ├── candidacies/
│       │   │   ├── placements/
│       │   │   ├── weekly-logs/
│       │   │   ├── attendance/
│       │   │   ├── evaluations/
│       │   │   ├── final-reports/
│       │   │   ├── defense/
│       │   │   ├── notifications/
│       │   │   └── privacy/
│       │   │
│       │   ├── components/
│       │   │   └── ui/
│       │   │
│       │   ├── lib/
│       │   │   ├── api/
│       │   │   ├── auth/
│       │   │   ├── i18n/
│       │   │   ├── validation/
│       │   │   └── utils/
│       │   │
│       │   ├── locales/
│       │   │   ├── en/
│       │   │   └── so/
│       │   │
│       │   ├── assets/
│       │   │   └── brand/
│       │   │
│       │   └── main.tsx
│       │
│       ├── public/
│       ├── tests/
│       ├── package.json
│       ├── package-lock.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── eslint.config.js
│       ├── Dockerfile
│       └── .dockerignore
│
├── e2e/
│   ├── tests/
│   ├── fixtures/
│   ├── helpers/
│   ├── playwright.config.ts
│   └── package.json
│
├── infra/
│   ├── compose.yaml
│   ├── compose.staging.yaml
│   ├── compose.production.yaml
│   ├── reverse-proxy/
│   ├── postgres/
│   └── monitoring/
│
├── docs/
│   ├── architecture/
│   │   ├── REPOSITORY_STRUCTURE.md
│   │   └── ...
│   ├── product/
│   │   ├── BRAND_AND_UI_GUIDELINES.md
│   │   └── ...
│   ├── api/
│   ├── adr/
│   ├── runbooks/
│   └── CLAUDE_IMPLEMENTATION_PHASES.md
│
├── scripts/
│   ├── dev/
│   ├── database/
│   └── deployment/
│
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   ├── pull_request_template.md
│   └── CODEOWNERS
│
├── .env.example
├── .gitignore
├── CLAUDE.md
├── README.md
└── SECURITY.md
```

# Backend feature convention

```text
feature/
├── api/
├── application/
├── domain/
└── infrastructure/
```

Example:

```text
opportunity/
├── api/
│   ├── OpportunityController.java
│   ├── CreateOpportunityRequest.java
│   └── OpportunityResponse.java
├── application/
│   ├── CreateOpportunityService.java
│   ├── PublishOpportunityService.java
│   └── OpportunityQueryService.java
├── domain/
│   ├── InternshipOpportunity.java
│   ├── OpportunityMode.java
│   ├── OpportunityStatus.java
│   └── OpportunityRepository.java
└── infrastructure/
    └── persistence/
```

Do not create a single global controller/service/repository/entity tree for all modules.

# Frontend feature convention

```text
features/opportunities/
├── api/
├── components/
├── hooks/
├── pages/
├── schemas/
└── types/
```

Generic UI only:

```text
components/ui/
```

# Whole-system tests

Playwright lives at repo root because it tests:

```text
Browser
  -> React
  -> Spring Boot
  -> PostgreSQL
```

# Infrastructure

Infrastructure code belongs under `infra/`.

Do not add Kubernetes/Terraform/Helm just because they are common in larger systems. Add infrastructure only when FursadHub actually needs it.

# Documentation

Product/domain decisions belong under `docs/product/`.

Technical decisions belong under `docs/architecture/` or `docs/adr/`.

Operational procedures belong under `docs/runbooks/`.

# Billing readiness

Do not create billing code during early phases.

If billing is later implemented, add:

```text
apps/api/.../billing/
apps/web/src/features/billing/
```

while preserving separation between:

- authorization
- feature flags
- commercial entitlements
- payment-provider integration


# Approved current brand reference

Until individual exported logo assets are saved in `apps/web/src/assets/brand/`, the current approved source reference is:

```text
/mnt/data/ghostwriter_images/context/c22b974b-b966-528c-bdfb-e42ea180a75e.png
```

Recommended eventual stored assets:

```text
apps/web/src/assets/brand/
├── logo-light.png or .svg
├── logo-dark.png or .svg
├── logo-cream.png or .svg
├── logo-mark.png or .svg
└── favicon.png or .svg
```
