# First Claude Code Prompt

Run Claude Code from the FursadHub repository root.

Send this message:

---

Read these files completely before changing anything:

1. `CLAUDE.md`
2. `docs/architecture/REPOSITORY_STRUCTURE.md`
3. `docs/product/BRAND_AND_UI_GUIDELINES.md`
4. `docs/CLAUDE_IMPLEMENTATION_PHASES.md`

Treat them as the FursadHub engineering source of truth.

Inspect the current repository before editing it.

Execute **PHASE 0 — ENGINEERING FOUNDATION only**.

Requirements:

- Preserve the agreed monorepo structure.
- Preserve the modular-monolith architecture.
- Build the backend/frontend/testing/CI/local-infrastructure foundation only.
- Establish the centralized frontend design-token and motion foundation.
- Use the approved FursadHub logo reference sheet and/or exported approved brand assets.
- The exact approved logo reference sheet currently is:

```text
/mnt/data/ghostwriter_images/context/c22b974b-b966-528c-bdfb-e42ea180a75e.png
```

- Preserve the approved identity exactly:
  - `FH` monogram
  - arched doorway
  - open orange door
  - roadway/path extending from the door
  - `FursadHub` wordmark
  - exact tagline: `Opening doors to your future.`
- Use the light-logo variant on light surfaces and the dark-logo variant on dark surfaces.
- Use the approved initial working palette:
  - `#091423`
  - `#F8891F`
  - `#E56D0E`
  - `#FBF6EE`
  - `#EDCFAE`
- Do NOT invent a new logo.
- Do NOT change the tagline.
- Do NOT silently invent a different permanent brand palette or typography.
- Do NOT implement authentication business flows yet.
- Do NOT implement billing, subscriptions, pricing, checkout, or payment providers.
- Do NOT implement Phase 1 or later functionality.
- Do NOT store authentication tokens in localStorage.
- Do NOT commit JWT private keys or any real secrets.
- Run all Phase 0 verification commands that can be run in the local environment.
- Review your own Git diff and remove unrelated changes.
- Stop with the exact required phase report from `docs/CLAUDE_IMPLEMENTATION_PHASES.md`.

Do not start Phase 1 automatically.

---
