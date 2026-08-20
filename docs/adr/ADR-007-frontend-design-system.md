# ADR-007: Centralized Frontend Design System

## Status

Accepted

## Context

FursadHub serves five distinct role-based areas (public, student, university, organization, admin) that must all clearly belong to one coherent, professional product, support English and Somali without breaking layout, and communicate business-critical status (verification, offers, placements) through a consistent, accessible, motion-aware visual language. The approved brand identity (FH monogram, arched doorway, open orange door, roadway, `FursadHub` wordmark, tagline "Opening doors to your future.") is fixed and must not be reinterpreted by implementation work.

## Decision

- All colors, spacing, radius, shadow, and motion values come from centralized design tokens (CSS custom properties mapped into semantic Tailwind utilities such as `bg-brand-primary`, `text-foreground`, `border-border`), never from arbitrary per-page values like `bg-blue-600` or `bg-[#1f2937]`.
- The initial working palette (`#091423` navy, `#F8891F` orange, `#E56D0E` deep orange, `#FBF6EE` cream, `#EDCFAE` warm beige) is treated as provisional-but-approved: derived from the supplied logo reference sheet and explicitly flagged as awaiting final team confirmation rather than treated as permanently locked.
- The approved logo reference sheet is the visual source of truth until individually exported asset files replace it; the logo concept, wordmark, and exact tagline are never redrawn, distorted, recolored, or paraphrased.
- A shared `components/ui/` library provides generic primitives (Button, Input, Badge, StatusBadge, StatusIndicator, AnimatedCheck, Skeleton, etc.) with controlled variants, used by every feature and every role-based layout, so status/motion language is implemented once rather than reinvented per feature.
- Motion is purposeful and centralized (duration/easing tokens), respects `prefers-reduced-motion`, and prefers `transform`/`opacity` — no page communicates status through a uniquely bespoke animation.
- Translation keys (not hardcoded strings) back all production UI text, organized per-feature under `locales/en/` and `locales/so/`.

## Consequences

- Implementation work (Claude Code or otherwise) can build UI freely within the token system without needing brand approval for every screen, while permanent identity decisions (palette, typography family, logo treatment) stay reserved for the FursadHub team.
- A change to a token value propagates consistently across the whole product instead of requiring per-page hunting-and-fixing.
- Frontend code must import shared primitives rather than rebuilding styled buttons/status badges per feature; code review should catch drift back toward arbitrary Tailwind values.
