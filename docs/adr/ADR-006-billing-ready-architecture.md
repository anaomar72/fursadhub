# ADR-006: Billing-Ready Architecture Without Billing Implementation

## Status

Accepted

## Context

The pilot is free, and real payment processing must not be implemented until explicitly requested. At the same time, the FursadHub team wants the future addition of billing (for organizations and/or universities) to not require a disruptive rewrite of core domain code.

## Decision

Keep four concepts strictly separate in the architecture, even though only the first exists today:

- **Authorization** — is this user allowed to act on this resource? (implemented now)
- **Entitlement** — does this account's commercial plan include this feature? (not implemented now)
- **Feature flags** — is this feature enabled for this environment/rollout? (not implemented now, and distinct from entitlement)
- **Billing provider integration** — the actual payment processor (Stripe, mobile money, etc.) (not implemented now)

Concretely, this means:

- no role names encode a commercial tier (never `PRO_RECRUITER`, `PREMIUM_UNIVERSITY_ADMIN`)
- no plan-conditional checks (`if (organization.getPlan().equals("PRO"))`) are scattered through core business code
- when billing is eventually built, it lives in its own bounded module (`billing/` backend, `features/billing/` frontend) behind centralized abstractions such as `EntitlementService` / `UsageLimitService`, and core domains depend on those abstractions, never on a payment provider SDK directly
- students are never assumed to pay for core internship participation; potential billed account types are organizations and universities

No `BillingAccount`, `Plan`, `Subscription`, or payment-provider code is created before the FursadHub team explicitly requests it.

## Consequences

- Early domain code stays free of speculative commercial logic, which keeps it simpler and easier to review during the free pilot.
- When billing is eventually introduced, it should be additive (new module + entitlement checks at specific boundaries) rather than requiring changes scattered through `opportunity`, `candidacy`, `placement`, etc.
- Any future payment-webhook handling must be idempotent and signature-validated, and provider-specific code must stay inside `billing/infrastructure`, not leak into core domains.
