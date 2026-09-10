# Deployment

What an operator needs in order to run FursadHub outside a laptop. Everything here was read from
the repository as it stands — configuration keys, defaults and behaviour are not aspirational.

Related: [`.env.example`](../../.env.example) (every variable, with inline notes),
[`SECURITY.md`](../../SECURITY.md), [ADR-004](../adr/ADR-004-private-object-storage.md).

---

## 0. External prerequisites — obtain these before you deploy

Two things this repository cannot provide and does not contain. Both must exist **before** the API
will start, because the startup guard in section 2 refuses local-development stand-ins for either.

| Prerequisite | Status | Needed for |
|---|---|---|
| **A production SMTP account** | **EXTERNAL DEPLOYMENT TASK — not provisioned** | Email verification and password reset. Without it no account can complete sign-up. |
| **A private object-storage bucket** | **EXTERNAL DEPLOYMENT TASK — not provisioned** | Student ID evidence, application CVs, institution licences, final reports. The bucket must be private — no public-read policy, no static website hosting — and versioning should be enabled before launch (section 8). |

No credentials for either appear anywhere in this repository, and none should be added. The values
in `.env.example` are local-development conventions, not templates to fill in with production
secrets — supply production values through the deployment platform's own secret mechanism.

---

## 1. What gets deployed

| Image | Source | Serves | Port |
|---|---|---|---|
| `fursadhub-api` | `apps/api/Dockerfile` | Spring Boot API | 8080 |
| `fursadhub-web` | `apps/web/Dockerfile` | Static SPA behind nginx | 80 |

`apps/api/Dockerfile` sets `SPRING_PROFILES_ACTIVE=production` by default, so the API image is
already on the production profile unless you override it.

`infra/compose.yaml` is **local development only** — PostgreSQL, MinIO and MailDev for a laptop. It
is not a production topology and has no TLS, no backups and no resource limits.

There is no deployment pipeline in this repository. `.github/workflows/ci.yml` compiles, tests and
builds; it does not publish images or deploy. Tag images with the Git commit SHA rather than
relying on `latest` (CLAUDE.md section 66).

### The frontend API URL is baked in at build time

Vite inlines `import.meta.env` at build time, so `VITE_API_BASE_URL` **cannot** be supplied when the
container starts. Pass it as a build argument:

```
docker build --build-arg VITE_API_BASE_URL=https://api.example.org/api/v1 -t fursadhub-web:<sha> apps/web
```

Omitting it bakes in the `http://localhost:8080/api/v1` fallback from `src/app/config/env.ts`, and
the resulting image cannot reach any real API.

---

## 2. The API refuses to start on a half-configured deployment

On the `staging` and `production` profiles, `ProductionConfigurationGuard` fails startup when the
deployment is still carrying local-development defaults, and reports **every** problem at once.
It checks signing material, outbound links and mail, and object storage.

This is deliberate. Each of these previously had a permissive default that let the API come up
"healthy" while being quietly broken — most seriously, a missing `JWT_PRIVATE_KEY` generated an
ephemeral in-memory keypair, so every restart invalidated every access token in circulation and a
second replica rejected the first replica's tokens.

`StorageConfig` separately refuses `STORAGE_PROVIDER=filesystem` on these profiles: private
documents must not be written to a container's ephemeral disk.

---

## 3. Required environment variables

**REQUIRED — the API will not start without these.**

| Variable | Notes |
|---|---|
| `DB_HOST`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` | Connection is forced to `sslmode=require`. `DB_PORT` defaults to 5433 in production, 5432 in staging. |
| `FURSADHUB_CORS_ALLOWED_ORIGINS` | Exact frontend origin(s). No default on these profiles. Never `*` — the refresh cookie is credentialed. |
| `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` | RS256 keypair. Distinct per environment; never reuse across environments and never commit them. |
| `EMAIL_VERIFICATION_CODE_SECRET` | HMAC key that hashes the 4-digit verification code at rest. |
| `APP_BASE_URL` | Public frontend base URL. It is the base of links in verification and password-reset emails. |
| `SMTP_HOST` (+ `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS`) | A real provider. `SMTP_FROM` should be a domain you actually control. |
| `STORAGE_BUCKET` | Must exist and be **private** — no public-read policy, no static website hosting. |
| `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | Real credentials. The repository's committed values are local MinIO conventions and are refused. |
| `STORAGE_ENDPOINT` | Required for self-hosted S3-compatible storage. Leave **blank** for AWS S3 itself. |

**OPTIONAL**

| Variable | Default |
|---|---|
| `SERVER_PORT` | `8080` |
| `JWT_ACCESS_TOKEN_TTL` | `10m` |
| `REFRESH_TOKEN_TTL` | `30d` |
| `EMAIL_VERIFICATION_TOKEN_TTL` | `10m` |
| `PASSWORD_RESET_TOKEN_TTL` | `1h` |
| `EMAIL_VERIFICATION_RESEND_COOLDOWN` | `60s` |
| `LOGIN_MAX_ATTEMPTS_PER_EMAIL` / `_PER_IP` | `10` / `30` per 15-minute window |
| `COOKIE_DOMAIN` | blank (host-only cookie) |
| `STORAGE_REGION` | `us-east-1` |
| `BOOTSTRAP_SUPER_ADMIN_EMAIL` | blank — see below |

`COOKIE_SECURE` is forced to `true` by the staging and production profiles; do not set it.

**DEV-ONLY — never set in a deployment**

`STORAGE_PROVIDER=filesystem`, `STORAGE_FILESYSTEM_DIRECTORY`. The `local` profile additionally
enables `show-sql` and seeds a fixed development administrator; neither exists on other profiles.

---

## 4. First administrator

Platform roles can only be granted by an existing `SUPER_ADMIN`, so an empty table would be a
deadlock. To break it once:

1. Register the account through the normal sign-up flow and verify its email.
2. Set `BOOTSTRAP_SUPER_ADMIN_EMAIL` to that address and restart.
3. Confirm the account can reach `/admin`, then **clear the variable** and restart.

Startup does nothing unless the account already exists, and nothing at all once any active platform
grant exists — so it cannot later restore authority to an account someone deliberately revoked.

The `local` profile's seeded `admin@fursadhub.local` account is a development convenience only. It
is `@Profile("local")` and cannot run on any other profile. It is also idempotent: if the account
already exists it is left alone, **including its password** — so a rotated local password is not
reset by restarting.

---

## 5. Database and migrations

Flyway runs on startup. `baseline-on-migrate` is `false`, so pointing at a non-empty database that
Flyway has never managed will fail rather than guess a baseline. Hibernate is `ddl-auto: validate`
— the application never alters the schema.

Migrations are `V1`–`V52` and are forward-only. Never renumber or edit an applied migration.

Take a backup before deploying a release that adds migrations. Roll back by restoring that backup,
not by reversing migrations — there are no down-migrations.

---

## 6. Health checks

| Endpoint | Use |
|---|---|
| `/actuator/health/liveness` | Restart probe. Used by the API image's own `HEALTHCHECK`. |
| `/actuator/health/readiness` | Traffic probe — fails while Flyway is still migrating. |
| `/actuator/health` | Aggregate. `show-details` is `when-authorized`, so an anonymous caller sees status only. |

**Point platform probes at `/liveness` and `/readiness`, never at the aggregate.** The aggregate
includes Spring Boot's auto-configured mail health indicator, which opens an SMTP connection. A
mail-provider outage therefore turns the aggregate `DOWN` while the application is serving traffic
perfectly well — a load balancer probing the aggregate would evict every healthy instance over an
email problem. This was observed directly during release testing: with SMTP pointed at an
unreachable host, `/actuator/health` reported `DOWN` while both `/liveness` and `/readiness`
reported `UP`.

Only `health` and `info` are exposed. Do not widen `management.endpoints.web.exposure.include` on a
public listener.

---

## 7. Reverse proxy and TLS

Both profiles set `server.forward-headers-strategy: framework`, so the API honours
`X-Forwarded-Proto` / `-For` / `-Host`. Terminate TLS at the edge and set those headers — without
them the API cannot tell it is on HTTPS, and `Secure` cookies will not behave.

The web image's nginx sets `X-Content-Type-Options`, `X-Frame-Options: DENY` and `Referrer-Policy`.
**HSTS belongs at the TLS edge** and is not set here. There is **no Content-Security-Policy** yet —
see the open items below.

---

## 8. Backups — required before the pilot carries real data

This repository automates no backups. FursadHub holds student identity evidence, CVs, final
reports, institution licences and the whole account and workflow record, so the operator **must**
put the following in place before real users are onboarded. This is a launch requirement, not a
recommendation (CLAUDE.md section 67).

### PostgreSQL

| | Minimum |
|---|---|
| **How** | Managed automated backups from the database provider are the **recommended** configuration — enable point-in-time recovery if the provider offers it. Where the database is self-hosted, a scheduled `pg_dump` of the whole database to off-host storage is the minimum. |
| **Frequency** | Daily, at minimum. Providers offering continuous WAL archiving should have it enabled. |
| **Retention** | 7 daily, 4 weekly, 3 monthly. |
| **Location** | Outside the primary host's failure domain — a backup on the same machine or the same volume is not a backup. |
| **Responsibility** | Named to a specific person or on-call rota before launch, not left to "the team". |

Take a manual backup immediately before deploying any release that adds migrations. There are no
down-migrations; rollback means restoring that backup.

### Private object storage

The bucket holds student ID evidence, application CVs, institution licences and final reports.
**None of this is in PostgreSQL, and a database backup does not cover any of it.**

| | Minimum |
|---|---|
| **How** | Enable **object versioning** on the bucket, plus either provider-managed replication or a scheduled copy to a second bucket. |
| **Retention** | At least as long as the database retention above, so a restored database still has the documents its rows reference. |
| **Deletion protection** | Versioning must be on before launch — it is the only protection against an accidental or malicious delete, and it cannot be applied retroactively. |
| **Responsibility** | Same named owner as the database backup. |

### Restore testing

**A backup is not valid because it exists. It is valid because a restore has succeeded.** Restore
into a temporary, isolated instance on a defined schedule — quarterly at minimum, and after any
change to the backup configuration — and verify the application starts against it and that a
document referenced by a restored row still downloads. Record the date of the last successful
restore test somewhere the operator can find it.

---

## 9. Edge rate limiting — required at launch

The application's own limiter is an in-process `ConcurrentHashMap`. Limits therefore reset on
restart and are divided across replicas: behind N instances the effective limit is N× the
configured one. It also covers only some endpoints. **The reverse proxy must provide the real
protection.** Configure request-rate limits, at minimum, on:

| Endpoint | App-level limiter today |
|---|---|
| `POST /api/v1/auth/login` | per-identifier and per-IP (`LOGIN_MAX_ATTEMPTS_PER_EMAIL` / `_PER_IP`, 15-min window) |
| `POST /api/v1/auth/password/forgot` | yes |
| `POST /api/v1/auth/email/resend` | yes |
| `POST /api/v1/auth/email/verify` | yes |
| `POST /api/v1/auth/register` | **none** |
| `GET /api/v1/public/**` (opportunities, organizations, universities, testimonials) | **none** — paginated and capped at 50 per page, but unlimited in request rate |

Registration and the public directories have no application-level protection at all; without an
edge limit they are open to enumeration and spam. Distributed application-level rate limiting is
tracked as post-launch debt (P2) precisely because the edge covers it for the pilot.

---

## 10. Post-launch debt (known, accepted for the pilot)

- **No Content-Security-Policy** on the web image. The other headers are set. Adding a CSP requires
  inventorying the app's real script/style/font/connect sources first, so it is deliberately not
  done blind.
- **Application-level rate limiting is in-process and partial** — see section 9. Edge protection is
  the launch requirement; a shared-store limiter is the follow-up.
- **No centralised error monitoring.** Logs go to stdout at `INFO` with request correlation, which
  is enough to diagnose a pilot incident, but there is no aggregation or alerting.
- **No deployment pipeline.** CI compiles, tests and builds; images are built and promoted manually
  using the steps in this document.
- **Unbounded collections at future scale**: the platform escalation queue and the nomination
  eligible-student list return unpaginated. Fine for one pilot university; revisit before growth.
- **Main JS chunk is ~1.4 MB (~352 kB gzipped)** with no code splitting.
